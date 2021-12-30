from lxml import html
import requests
import json
import sys


mtg_format = 'legacy'
price_cutoff = -1

if len(sys.argv) > 1:
    mtg_format = sys.argv[1]
if len(sys.argv) > 2:
    price_cutoff = float(sys.argv[2])
if len(sys.argv) > 3:
    file_name = sys.argv[3]
else:
    file_name = mtg_format + '_meta'

# Use metamox to get meta page
page = requests.get('http://www.metamox.com/' + mtg_format + '/')

#Scrape html for list of cards:
tree = html.fromstring(page.content)
card_names = tree.xpath('//td/following-sibling::td/following-sibling::td/child::a[@oracle_id]/text()')

print('Cards: ', card_names)
print('Count: ', len(card_names))

cards = []

for i in range(0, len(card_names)):
    response = requests.get('https://api.scryfall.com/cards/named?exact=' + card_names[i])
    scryCard = response.json()
    if price_cutoff < 0 or ('prices' in scryCard and 'usd' in scryCard['prices'] and scryCard['prices']['usd'] is not None):
        if (price_cutoff < 0 or float(scryCard['prices']['usd']) < price_cutoff):
            # print(scryCard)
            card = {
                'id': scryCard['id'],
                'oracle_id': scryCard['oracle_id'],
                'uri': scryCard['uri'],
                'scryfall_uri': scryCard['scryfall_uri'],
                'name': scryCard['name'],
                'cmc': scryCard['cmc'],
                'artist': scryCard['artist']
            }
            # Add the image url if card has one side
            if ('image_uris' in scryCard):
                card['image_uri'] = scryCard['image_uris']['png']
                card['image_uri_hover'] = scryCard['image_uris']['png']
            # If card has 2 faces
            if ('card_faces' in scryCard):
                # Add the front image url if card has two sides
                if ('image_uris' in scryCard['card_faces'][0]):
                    card['image_uri'] = scryCard['card_faces'][0]['image_uris']['png']
                # Add the back image url if card has two sides
                if ('image_uris' in scryCard['card_faces'][1]):
                    card['image_uri_hover'] = scryCard['card_faces'][1]['image_uris']['png']
                # Join oracle/type/cost for 2-faced cards
                card['oracle_text'] = scryCard['card_faces'][0]['oracle_text'] + "\n//\n" + scryCard['card_faces'][1]['oracle_text']
                card['type_line'] = scryCard['card_faces'][0]['type_line'] + " // " + scryCard['card_faces'][1]['type_line']
                card['mana_cost'] = scryCard['card_faces'][0]['mana_cost'] + " // " + scryCard['card_faces'][1]['mana_cost']
            else:
                # Add oracle/type/cost for normal cards (1 face)
                card['mana_cost'] = scryCard['mana_cost']
                card['type_line'] = scryCard['type_line']
                card['oracle_text'] = scryCard['oracle_text']
            # Add color prefix
            card['colors'] = '.'
            # Loop through the colors
            for color in scryCard['color_identity']:
                # Append each color
                card['colors'] = card['colors'] + color
            # Add color suffixx
            card['colors'] = card['colors'] + '.'

            cards.append(card)

            print(card_names[i] + ': added')
        else:
            print(card_names[i] + ': too expensive')
    else:
        print(card_names[i] + ': couldn\'t find price')
    
#Save to file
with open(file_name + '.json', 'w') as f:
    json.dump(cards, f, ensure_ascii=False, indent=4)