# Build Buddy Project

This project has been forked from the frontend of [chatgpt-minimal](https://github.com/blrchen/chatgpt-minimal), and the instructions for how to use the frontend can be found on the original repository.

## Project Overview

This project is a messily built bot which serves as an improvised store assistance. A backend API through Flask takes in a list of products and returns an image of the store. 

Each conversation is logged and stored using an SQL Alchemy database. Whenever a user sends a message, the chat log is saved. Included in this, is a functionality that allows the GPT API to pretend to be Build Bot and generate fake data.

In a bit unorthodox method, the bot gives JSON to users once they confirm their list. This communication is prefixed with "FINAL_PRODUCT_DATA" and concludes with "END_PRODUCT_DATA". The frontend listens for these phrases in each response, and once both these phrases are received, assumes that whatever lies between these tags is JSON. This data is then sent in plain text to the API for further parsing.

This project is very much a quick-fix system and for a more professional setup, it is recommended to utilise "Functions" provided by the GPT API for intelligent API calls.

## Future Updates

In due course, the GPT API will receive a multimodal update which will enable GPT to handle image processing. An Open AI API key is needed for this functionality to be used.

## Additional Information

The API has an endpoint `(/analytics)`. This endpoint delivers an HTML page that displays all the conversations logged through the database.

## Disclaimer
Remember, I jerry-rigged this whole system together in three days, so my main focus was not on a proper implementation. Hopefully, this gives you a good idea of what was done and points you in the right direction should you want to set this up as a corporate-level system. The documentation and resources are out there to help make the implementation process a lot cleaner and professional.