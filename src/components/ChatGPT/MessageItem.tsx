import React, { useEffect, useState } from 'react';
import MarkdownIt from 'markdown-it';
import mdHighlight from 'markdown-it-highlightjs';
import mdKatex from 'markdown-it-katex';
import { ChatMessageItemProps } from './interface';

const md = MarkdownIt({ html: true }).use(mdKatex).use(mdHighlight)
const fence = md.renderer.rules.fence!
md.renderer.rules.fence = (...args) => {
  const [tokens, idx] = args
  const token = tokens[idx]
  const rawCode = fence(...args)

  return `<div relative>
  <div data-clipboard-text=${encodeURIComponent(token.content)} class="copy-btn">
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"><path fill="currentColor" d="M28 10v18H10V10h18m0-2H10a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Z" /><path fill="currentColor" d="M4 18H2V4a2 2 0 0 1 2-2h14v2H4Z" /></svg>
    <div>Copy</div>
  </div>
  ${rawCode}
  </div>`
}

const MessageItem = (props: ChatMessageItemProps) => {
  const { message } = props;

  const [imageUrl, setImageUrl] = useState("");
  const [apiCalled, setApiCalled] = useState(false);

  let displayMessage = message.content;
  const indexOfStart = displayMessage.indexOf("FINAL_PRODUCT_DATA");

  if (indexOfStart !== -1) {
    displayMessage = displayMessage.slice(0, indexOfStart);
  }

  const shouldDisplayImage =
    message.content.includes("END_PRODUCT_DATA") && indexOfStart !== -1;
  const isGeneratingMap =
    indexOfStart !== -1 && !shouldDisplayImage;

  useEffect(() => {
    const fetchImage = async () => {
      let jsonData = message.content.slice(
        indexOfStart + 18,
        message.content.indexOf("END_PRODUCT_DATA")
      ).trim();

      // If first and last character are quotes, remove them
      if (jsonData.startsWith('"') && jsonData.endsWith('"')) {
        jsonData = jsonData.slice(1, -1);
      }

      try {
        const response = await fetch('https://api.stephyaz.com/draw_text', {
          method: 'POST',
          body: JSON.stringify(jsonData),
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const blob = await response.blob();
        setImageUrl(URL.createObjectURL(blob));
      } catch (err) {
        console.error(err);
      }
    };

    // When END_PRODUCT_DATA is present and the API hasn't been called yet, then fetch the image
    if (shouldDisplayImage && !apiCalled) {
      fetchImage();
      setApiCalled(true); // Set to true to ensure API is only called once
    }
  }, [message.content, shouldDisplayImage, indexOfStart, apiCalled]);

  return (
    <div className="message-item">
      <div className="meta">
        <div className="avatar">
          <span className={message.role}></span>
        </div>
        <div className="message" dangerouslySetInnerHTML={{ __html: md.render(displayMessage) }} />
        {isGeneratingMap && <p>generating map...</p>}
      </div>
      <div>
        {shouldDisplayImage && imageUrl && (
          <img
            src={imageUrl}
            alt="Final Product"
            style={{ width: "100%", height: "auto" }}
          />
        )}
      </div>
    </div>
  );
};

export default MessageItem;