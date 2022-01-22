var app = angular.module('myApp', []);
app.controller('myCtrl', function($scope, $window, $http, $timeout) {
    // Search/pagination variables
    $scope.page = 0;
    $scope.search = {};
    $scope.itemLimit = 60;

    // Dropdown lists
    $scope.colors = [
        { value: '', display: 'All' },
        { value: '00-C', display: 'Colorless' },
        { value: '01-W', display: 'White' },
        { value: '02-U', display: 'Blue' },
        { value: '03-B', display: 'Black' },
        { value: '04-R', display: 'Red' },
        { value: '05-G', display: 'Green' },
        { value: '06-WU', display: 'Azorius (WU)' },
        { value: '07-UB', display: 'Dimir (UB)' },
        { value: '08-BR', display: 'Rakdos (BR)' },
        { value: '09-RG', display: 'Gruul (RG)' },
        { value: '10-GW', display: 'Selesnya (GW)' },
        { value: '11-WB', display: 'Orzhov (WB)' },
        { value: '12-UR', display: 'Izzet (UR)' },
        { value: '13-BG', display: 'Golgari (BG)' },
        { value: '14-RW', display: 'Boros (RW)' },
        { value: '15-GU', display: 'Simic (GU)' },
        { value: '16-M', display: '3+ Colors' }
    ];
    $scope.rarities = [
        { value: null, display: 'All' },
        { value: 'C', display: 'Common' },
        { value: 'U', display: 'Uncommon' },
        { value: 'R', display: 'Rare' }
    ];
    $scope.sortOptions = [
        { value: 'colors', display: 'Colors' },
        { value: 'cmc', display: 'CMC' },
        { value: 'name', display: 'Name' },
        { value: null, display: 'File Order' }
    ];
    $scope.importOptions = [
        { value: '', display: 'All Cards from File' },
        { value: '-', display: 'Random Cards of Any Color' },
        { value: '00-C', display: 'Random Colorless' },
        { value: '01-W', display: 'Random White' },
        { value: '02-U', display: 'Random Blue' },
        { value: '03-B', display: 'Random Black' },
        { value: '04-R', display: 'Random Red' },
        { value: '05-G', display: 'Random Green' },
        { value: '06-WU', display: 'Random Azorius (WU)' },
        { value: '07-UB', display: 'Random Dimir (UB)' },
        { value: '08-BR', display: 'Random Rakdos (BR)' },
        { value: '09-RG', display: 'Random Gruul (RG)' },
        { value: '10-GW', display: 'Random Selesnya (GW)' },
        { value: '11-WB', display: 'Random Orzhov (WB)' },
        { value: '12-UR', display: 'Random Izzet (UR)' },
        { value: '13-BG', display: 'Random Golgari (BG)' },
        { value: '14-RW', display: 'Random Boros (RW)' },
        { value: '15-GU', display: 'Random Simic (GU)' },
        { value: '16-M', display: 'Random 3+ Colors' }
    ];
    $scope.scryImportOptions = [
        { value: null, display: 'By Page' },
        { value: true, display: 'Random Cards' }
    ];
    
    // Format card list
    $scope.cards = [];

    // Deck list
    $scope.deck = [];

    // List of errors (mostly for http request failures)
    $scope.errors = [];
    
    // Autofills
    $scope.filename = 'My Format';
    $scope.autoQuery = '';
    $scope.autoResults = [];
    $scope.scryQuery = {
        query: 'f:vintage usd<2',
        numCards: 1,
        isRandom: null
    }
    $scope.sortProp = 'colors';
    $scope.jsonCards = [];
    $scope.importType = '';
    $scope.addNumber = 1;

    // Debbounce
    $scope.debounceTime = 350;

    // Tab Ids
    $scope.uploadTabId = 'upload';
    $scope.addTabId = 'add';
    $scope.scryTabId = 'scry';
    $scope.saveTabId = 'save';
    $scope.slideoutTab = $scope.uploadTabId;
    

    // Handle uploading the JSON
    $scope.uploadFormatJSON = function(fileEl) {
        var files = fileEl.files;
        var file = files[0];
        var reader = new FileReader();
      
        reader.onloadend = function(evt) {
            if (evt.target.readyState === FileReader.DONE) {
                $scope.$apply(function () {
                    // Save the cards in an intermediate variable
                    $scope.jsonCards = JSON.parse(evt.target.result);
                });
            }
        };
        
        reader.readAsText(file);
    }

    // Import uploaded JSON file
    $scope.addJSON = function() {
        if ($scope.importType == '') {
            // 'All Cards from File' is selected
            $scope.addFullJSON();
        } else {
            // Any random option is selected
            $scope.addRandomJSON($scope.addNumber);
        }
    }

    // Add cards from the intermediate json list to the format
    $scope.addFullJSON = function() {
        $scope.jsonCards.forEach(card => {
            card.colors = $scope.convertColor(card.colors);
            // Only add if it doesn't exist in the list yet
            if ($scope.findCardIndex(card) === -1) {
                $scope.cards.push(card);
            }
        });
    }

    // Add a number of random cards from the json
    $scope.addRandomJSON = function(number) {
        // Filter the cards by the color selected in import options
        var colorCards = $scope.jsonCards.filter(card => card.colors.includes($scope.importType));
        var rand;
        var randCard;
        // Keep track of how many cards have been added
        var count = 0;
        while (count < number) {
            // Get a random index
            rand = Math.floor(Math.random() * colorCards.length);
            randCard = colorCards[rand];
            if (randCard == null) {
                // Break if it couldn't find the card (list is probably empty)
                break;
            }
            if ($scope.findCardIndex(randCard) === -1) {
                // Only add if it doesn't exist in the list yet
                $scope.cards.push(randCard);
                // Increment count when a card is found
                ++count;
            }
            // Remove card from list so that it doesn't get selected again
            colorCards.splice(rand, 1);
        }
    }

    // Download a json file
    $scope.downloadFormatJSON = function() {
        // create a download link
        var link = document.createElement("a");
        link.download = $scope.filename + ".json";
        // Set the card list as its content
        var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify($scope.cards, null, "\t"));
        link.href = "data:" + data;
        // Click the link
        link.click();
    };


    // Fetch a list of cards from Scryfall for autocomplete dropdown on "Add a Card" tab
    $scope.getCardsAutocomplete = function() {
        if ($scope.autoQuery.length > 2) {
            $http({
                method: 'GET',
                url: 'https://api.scryfall.com/cards/autocomplete?q=' + $scope.autoQuery
                }).then(function successCallback(response) {
                    $scope.autoResults = response.data.data;
                }, function errorCallback(response) {
                    $scope.errors.push(response);
            });
        }
    }

    // Add a single card
    $scope.addCard = function() {
        // Fetch card from Scryfall by name
        $http({
            method: 'GET',
            url: 'https://api.scryfall.com/cards/named?exact=' + $scope.autoQuery
            }).then(function successCallback(response) {
                // Only add if it doesn't exist in the list yet
                if ($scope.findCardIndex(response.data) === -1) {
                    $scope.cards.push($scope.convertCard(response.data));
                }
            }, function errorCallback(response) {
                $scope.errors.push(response);
        });
        $scope.autoQuery = '';
    }

    // Handle Scryfall search button
    $scope.addQueryCards = function() {
        if ($scope.scryQuery.isRandom) {
            // Just add random cards
            $scope.addRandomCard($scope.scryQuery.numCards, 0);
        } else {
            // Add full page
            $scope.addQueryPage();
        }
    }

    // Fetch a page from a Scryfall search
    $scope.addQueryPage = function() {
        $http({
            method: 'GET',
            url: 'https://api.scryfall.com/cards/search?q=' + $scope.scryQuery.query + '&page=' + $scope.scryQuery.numCards
            }).then(function successCallback(response) {
                // For each card on the page
                response.data.data.forEach(card => {
                    // Only add if it doesn't exist in the list yet
                    if ($scope.findCardIndex(card) === -1) {
                        $scope.cards.push($scope.convertCard(card));
                    }
                });
            }, function errorCallback(response) {
                $scope.errors.push(response);
        });
    }

    // Fetch a random card from Scryfall by search query
    // Depth is number of cards to add
    // Tries is number of failed attempts
    $scope.addRandomCard = function(depth, tries) {
        // If the there's still cards to add, and tries is not maxed out
        if (depth > 0 && tries < 10) {
            $http({
                method: 'GET',
                url: 'https://api.scryfall.com/cards/random?q=' +  $scope.scryQuery.query
                }).then(function successCallback(response) {
                    // Only add if it doesn't exist in the list yet
                    if ($scope.findCardIndex(response.data) === -1) {
                        $scope.cards.push($scope.convertCard(response.data));
                        // Get another random card
                        $scope.addRandomCard(--depth, 0);
                    }
                    else {
                        // Try again, and increment number of tries
                        $scope.addRandomCard(depth, ++tries);
                    }
                }, function errorCallback(response) {
                    $scope.errors.push(response);
            });
        }
    }
    
    // Converts a card from Scryfall data to this program for simple searching
    $scope.convertCard = function(scryCard) {
        var card = {
            id: scryCard.id,
            oracle_id: scryCard.oracle_id,
            uri: scryCard.uri,
            scryfall_uri: scryCard.scryfall_uri,
            name: scryCard.name,
            cmc: scryCard.cmc,
            artist: scryCard.artist
        };
        // If the card only has a front
        if (scryCard.image_uris) {
            card.image_uri = scryCard.image_uris.png;
            card.image_uri_hover = scryCard.image_uris.png;
        }
        // If there are multiple faces
        if (scryCard.card_faces) {
            // If it has 2 sides, add front
            if (scryCard.card_faces[0].image_uris) {
                card.image_uri = scryCard.card_faces[0].image_uris.png;
            }
            // If it has 2 sides, add back on hover
            if (scryCard.card_faces[1].image_uris) {
                card.image_uri_hover = scryCard.card_faces[1].image_uris.png;
            }
            // Combine the faces into one string for easy search
            card.oracle_text = scryCard.card_faces[0].oracle_text + "\n//\n" + scryCard.card_faces[1].oracle_text;
            card.type_line = scryCard.card_faces[0].type_line + " // " + scryCard.card_faces[1].type_line;
            card.mana_cost = scryCard.card_faces[0].mana_cost + " // " + scryCard.card_faces[1].mana_cost;
        } else {
            card.mana_cost = scryCard.mana_cost;
            card.type_line = scryCard.type_line;
            card.oracle_text = scryCard.oracle_text;
        }
        // Converts a card's color field from a list to a 'dot' string
        card.colors = '.';
        for (var color of scryCard.color_identity) {
            card.colors += color;
        }
        card.colors += '.';
        // Then convert 'dot' color to unique color string
        card.colors = $scope.convertColor(card.colors);
        
        return card;
    }

    // Converts a card's color field from a 'dot' string to a unique color string (for easy search)
    $scope.convertColor = function(dotColor) {
        if (!dotColor.startsWith('.')) {
            return dotColor;
        }
        switch (dotColor) {
            case '..':
                return '00-C';
            case '.W.':
                return '01-W';
            case '.U.':
                return '02-U';
            case '.B.':
                return '03-B';
            case '.R.':
                return '04-R';
            case '.G.':
                return '05-G';
            case '.UW.':
                return '06-WU';
            case '.BU.':
                return '07-UB';
            case '.BR.':
                return '08-BR';
            case '.GR.':
                return '09-RG';
            case '.GW.':
                return '10-GW';
            case '.BW.':
                return '11-WB';
            case '.RU.':
                return '12-UR';
            case '.BG.':
                return '13-BG';
            case '.RW.':
                return '14-RW';
            case '.GU.':
                return '15-GU';
            default:
                return '16-M';
        }
    }

    // Resets the current page to 0, refreshing cards
    $scope.resetPage = function() {
        $scope.page = 0;
    };

    // Reset filters
    $scope.reset = function() {
        $scope.search = {};
        $scope.resetPage();
    }
    
    // Clears the list of cards
    $scope.clear = function() {
        $scope.cards = [];
    }

    // Open Scryfall url in new tab
    $scope.openScry = function(url) {
        $window.open(url, '_blank');
    }

    // Delete a card from the format
    $scope.deleteCard = function(card) {
        $scope.cards.splice($scope.findCardIndex(card), 1);
    }

    // Add a card to the deck
    $scope.addToDeck = function(card) {
        $scope.deck.push(card);
    }

    // Delete a card from the deck
    $scope.deleteFromDeck = function(index) {
        $scope.deck.splice(index, 1);
    }
    
    // Gets the index of a card based on its name
    $scope.findCardIndex = function(card) {
        return $scope.cards.findIndex(x => x.name === card.name);
    }

    // Set the slideout tab
    $scope.setSlideout = function(tab) {
        if ($scope.slideoutTab == tab) {
            $scope.slideoutTab = null;
        } else {
            $scope.slideoutTab = tab;
        }
    }
});