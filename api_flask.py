from flask import Flask, request, send_file, jsonify
import json
import cv2
from PIL import Image, ImageDraw, ImageFont
from flask_cors import CORS
import uuid
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///conversations.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Conversation(db.Model):
    id = db.Column(db.String(), primary_key=True)
    messages = db.Column(db.Text, nullable=True)

with app.app_context():
    db.create_all()

def draw_text(image_path, text_lines, x1, y1, x2, y2, time_text, tx1, ty1, tx2, ty2,filename):
    image = Image.open(image_path)
    draw = ImageDraw.Draw(image)
    
    im_width, im_height = image.size

    x1, x2, y1, y2 = int(im_width * x1), int(im_width * x2), int(im_height * y1), int(im_height * y2)
    tx1, tx2, ty1, ty2 = int(im_width * tx1), int(im_width * tx2), int(im_height * ty1), int(im_height * ty2)

    region_width = x2 - x1
    region_height = y2 - y1

    time_font = ImageFont.truetype("Arial.ttf", 100)

    while time_font.getsize(time_text)[0] > (tx2 - tx1):
        time_font = ImageFont.truetype("Arial.ttf", time_font.size - 1)

    big_font = ImageFont.truetype("Arial.ttf", 100)
    small_font = ImageFont.truetype("Arial.ttf", 50)

    big_lines = [line for i, line in enumerate(text_lines) if i % 2 == 0]
    small_lines = [line for i, line in enumerate(text_lines) if i % 2 != 0]

    while big_font.getsize(max(big_lines, key=lambda line: big_font.getsize(line)[0]))[0] > region_width:
        big_font = ImageFont.truetype("Arial.ttf", big_font.size - 1)

    small_font = ImageFont.truetype("Arial.ttf", big_font.size // 2)

    while small_font.getsize(max(small_lines, key=lambda line: small_font.getsize(line)[0]))[0] > region_width:
        small_font = ImageFont.truetype("Arial.ttf", small_font.size - 1)

    big_line_height = big_font.getsize('A')[1]
    small_line_height = small_font.getsize('A')[1]

    space_between_items = int(big_line_height * 0.7)
    space_between_details = int(small_line_height * 0.4)

    y = y1
    
    draw.text(((tx1 + tx2 - time_font.getsize(time_text)[0]) // 2, (ty1 + ty2 - time_font.getsize(time_text)[1]) // 2), time_text, fill="black", font=time_font)
    
    for big_line, small_line in zip(big_lines, small_lines):
        draw.text((x1, int(y)), big_line, fill="black", font=big_font)
        y += big_line_height + space_between_details
        draw.text((x1, int(y)), small_line, fill="black", font=small_font)
        y += small_line_height + space_between_items

    # image.show()
    image.save(str(filename)+'.png', 'PNG')

@app.route('/draw_text', methods=['POST'])
def receive_data_and_draw():
    data_filter = request.json
    data_filter = data_filter.replace('`', '')
    data_filter = data_filter.replace('\n', '')
    data_filter = data_filter.replace('json', '')
    while data_filter[0] != '{':
        data_filter = data_filter[1:]
    print(data_filter)
    data = json.loads(data_filter) # Load the json data with yaml
    text_lines = []
    for item in data["items"]:
        text_lines.append(item['item_name'])
        text_lines.append('Price: ${} | Bay: {} | Isle: {}'.format(item['price'], item['bay'], item['aisle']))

    time_text = '{} minutes'.format(data['time_in_store'])

    #generate random ID for filename
    filename = str(uuid.uuid4())
    
    draw_text('/Users/syaz/Dropbox/PYprograms/Claire Davis Stupid/map_rev_1.png', text_lines, 0.03799630983190103, 0.09797671660803547, 0.38998077396589786, 0.8383578308209255, time_text, 0.03205688944594578, 0.9467066336411446, 0.24686733152911508, 0.978682233798563,filename)

    return send_file(str(filename)+'.png', mimetype='image/png')

@app.route('/conversations/<conversation_id>', methods=['POST'])
def update_conversation(conversation_id):
    messages = ', '.join(request.json.get('messages')) # change list to string
    conversation = Conversation.query.get(conversation_id)
    if conversation is not None:
        conversation.messages = messages
        db.session.commit()
        return jsonify({"message" : "Conversation updated"}), 200
    else:
        new_conversation = Conversation(id=conversation_id, messages=messages)
        db.session.add(new_conversation)
        db.session.commit()
        return jsonify({"message" : "New conversation created"}), 201

@app.route('/conversations/', methods=['GET'])
def get_conversations():
    conversations = Conversation.query.all()
    all_conversations = {}
    for conversation in conversations:
        all_conversations[conversation.id] = conversation.messages
    return jsonify(all_conversations)

if __name__ == '__main__':
    app.run(port=5000, debug=True)