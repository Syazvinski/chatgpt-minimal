import { Message } from '@/models'
import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser'

export const config = {
  runtime: 'edge'
}

const handler = async (req: Request): Promise<Response> => {
  try {
    const { messages } = (await req.json()) as {
      messages: Message[]
    }

    const charLimit = 12000
    let charCount = 0
    let messagesToSend = []

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      if (charCount + message.content.length > charLimit) {
        break
      }
      charCount += message.content.length
      messagesToSend.push(message)
    }

    const useAzureOpenAI =
      process.env.AZURE_OPENAI_API_BASE_URL && process.env.AZURE_OPENAI_API_BASE_URL.length > 0

    let apiUrl: string
    let apiKey: string
    let model: string
    if (useAzureOpenAI) {
      let apiBaseUrl = process.env.AZURE_OPENAI_API_BASE_URL
      const version = '2023-05-15'
      const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || ''
      if (apiBaseUrl && apiBaseUrl.endsWith('/')) {
        apiBaseUrl = apiBaseUrl.slice(0, -1)
      }
      apiUrl = `${apiBaseUrl}/openai/deployments/${deployment}/chat/completions?api-version=${version}`
      apiKey = process.env.AZURE_OPENAI_API_KEY || ''
      model = '' // Azure Open AI always ignores the model and decides based on the deployment name passed through.
    } else {
      let apiBaseUrl = 'https://api.openai.com'
      if (apiBaseUrl && apiBaseUrl.endsWith('/')) {
        apiBaseUrl = apiBaseUrl.slice(0, -1)
      }
      apiUrl = `${apiBaseUrl}/v1/chat/completions`
      apiKey = process.env.OPENAI_API_KEY || ''
      model = 'gpt-4' 
      // functions = [{name:'generate_store_map', description: 'used to generate the image that contains each product and a map to guide the customer through the store. should only be used once the customer has confirmed thier product list.', parameters:'test'}]
    }
    const stream = await OpenAIStream(apiUrl, apiKey, model, messagesToSend)

    return new Response(stream)
  } catch (error) {
    console.error(error)
    return new Response('Error', { status: 500 })
  }
}

const OpenAIStream = async (apiUrl: string, apiKey: string, model: string, messages: Message[]) => {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const res = await fetch(apiUrl, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'api-key': `${apiKey}`
    },
    method: 'POST',
    body: JSON.stringify({
      model: model,
      frequency_penalty: 0,
      max_tokens: 3000,
      messages: [
        {
          role: 'system',
          content: `Introduce yourself. Tell them what you do. You are named "Build Buddy" you are a bot developed by home depot made to give personalized advice to diy-ers. You will have customers come to you with an idea. Make sure you understand thier idea thouroughly. Your job is to create a full parts and tools list, then ask the customers what they already have if anything from the list. Try and convince and speed along the conversation to try and give them a final parts list. When any parts list, add price, parts,  iasle and bay number, store closest the the user, and the an ETA for time spent in store. (You can come up with theese on your own but keep it consistent). Keep your answers short and to the point. Make estimated time in store short, and give a general store name, like "Buckhead Home Depot, 9 min drive". Once you ask them if this plan is good and they say yes, tell them to come back to you and that you will help them through the application process. After they have confirmed the list and project, add the phrase "FINAL_PRODUCT_DATA" so that my backend knows to look for the Json. Put the JSON beneath "FINAL_PRODUCT_DATA". Also after you respnd with the json add in "END_PRODUCT_DATA"  Item name, price, bay, time in store, drive time, store name, iasle, should all be in json. Make sure that the text between the 2 tags for the produt data is loadable directly in python with json.loads() if it is a string. Make sure to confirm the customer is ready for the final list. also make sure to {"items": [{"item_name": "Wallpaper Stripper", "price": 20.0, "bay": 15, "aisle": 3}], "drive_time": 9, "store_name": "Buckhead Home Depot", "time_in_store": 20}`
        },
        ...messages
      ],
      stream: true,
    })
  })

  if (res.status !== 200) {
    const statusText = res.statusText
    throw new Error(
      `The OpenAI API has encountered an error with a status code of ${res.status} and message ${statusText}`
    )
  }

  return new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data

          if (data === '[DONE]') {
            controller.close()
            return
          }

          try {
            const json = JSON.parse(data)
            const text = json.choices[0].delta.content
            const queue = encoder.encode(text)
            controller.enqueue(queue)
          } catch (e) {
            controller.error(e)
          }
        }
      }

      const parser = createParser(onParse)

      for await (const chunk of res.body as any) {
        const str = decoder.decode(chunk).replace('[DONE]\n', '[DONE]\n\n')
        parser.feed(str)
      }
    }
  })
}
export default handler
