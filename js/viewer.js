var app = angular.module('myApp', []);
app.controller('myCtrl', function($scope, $window, $http, $timeout) {
    $scope.page = 0;
    $scope.search = {};
    $scope.itemLimit = 24;
    $scope.includeMid = false;
    $scope.includeExpensive = false;
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
        { value: 'R', display: 'Rare' },
    ];
    
    $scope.sortOptions = [
        { value: 'colors', display: 'Colors' },
        { value: 'cmc', display: 'CMC' },
        { value: 'name', display: 'Name' },
        { value: null, display: 'File Order' }
    ];
    
    $scope.cards = [];
    $scope.deck = [];

    $scope.errors = [];
    $scope.convertnum = 0;

    $scope.filename = 'My Format';
    $scope.autoQuery = '';
    $scope.autoResults = [];
    $scope.scryQuery = {
        query: 'f:vintage usd<2',
        numCards: 1,
        isRandom: true
    }
    $scope.sortProp = 'colors';
    $scope.debounceTime = 350;

    $scope.uploadTabId = 'upload';
    $scope.addTabId = 'add';
    $scope.scryTabId = 'scry';
    $scope.saveTabId = 'save';
    $scope.slideoutTab = $scope.uploadTabId;


    
    $scope.uploadFormatJSON = function(fileEl) {
        var files = fileEl.files;
        var file = files[0];
        var reader = new FileReader();
      
        reader.onloadend = function(evt) {
            if (evt.target.readyState === FileReader.DONE) {
                $scope.$apply(function () {
                    var jsonCards = JSON.parse(evt.target.result);
                    jsonCards.forEach(card => {
                        card.colors = $scope.convertColor(card.colors);
                        if ($scope.findCardIndex(card) === -1) {
                            $scope.cards.push(card);
                        }
                    });
                });
            }
        };
        
        reader.readAsText(file);
    }

    $scope.downloadFormatJSON = function() {
        var link = document.createElement("a");
        link.download = $scope.filename + ".json";
        var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify($scope.cards, null, "\t"));
        link.href = "data:" + data;
        link.click();
    };

    $scope.convert = function() {
        for (var i = $scope.convertnum; i < Math.min(cardsExpensive.length, $scope.convertnum + 200); ++i) {
            $scope.getRules(cardsExpensive[i]);
        }
        $scope.convertnum = $scope.convertnum + 200;
    }

    $scope.getRules = function(card) {
        $http({
              method: 'GET',
              url: 'https://api.scryfall.com/cards/multiverse/' + card.multiverse_id
            }).then(function successCallback(response) {
                if (response.data.card_faces && response.data.card_faces.length) {
                    card.oracle_text = response.data.card_faces[0].oracle_text;
                    for (var i = 1; i < response.data.card_faces.length; ++i) {
                        card.oracle_text = card.oracle_text + response.data.card_faces[i].oracle_text;
                    }
                } else {
                    card.oracle_text = response.data.oracle_text;
                }
            }, function errorCallback(response) {
                $scope.errors.push(response);
        });
    }

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

    $scope.addCard = function() {
        $http({
            method: 'GET',
            url: 'https://api.scryfall.com/cards/named?exact=' + $scope.autoQuery
            }).then(function successCallback(response) {
                if ($scope.findCardIndex(response.data) === -1) {
                    $scope.cards.push($scope.convertCard(response.data));
                }
            }, function errorCallback(response) {
                $scope.errors.push(response);
        });
        $scope.autoQuery = '';
    }

    $scope.addQueryCards = function() {
        if ($scope.scryQuery.isRandom) {
            $scope.addRandomCard($scope.scryQuery.numCards, 0);
        } else {
            $scope.addQueryPage();
        }
    }

    $scope.addQueryPage = function() {
        $http({
            method: 'GET',
            url: 'https://api.scryfall.com/cards/search?q=' + $scope.scryQuery.query + '&page=' + $scope.scryQuery.numCards
            }).then(function successCallback(response) {
                response.data.data.forEach(card => {
                    if ($scope.findCardIndex(card) === -1) {
                        $scope.cards.push($scope.convertCard(card));
                    }
                });
            }, function errorCallback(response) {
                $scope.errors.push(response);
        });
    }

    $scope.addRandomCard = function(depth, tries) {
        if (depth > 0 && tries < 10) {
            $http({
                method: 'GET',
                url: 'https://api.scryfall.com/cards/random?q=' +  $scope.scryQuery.query
                }).then(function successCallback(response) {
                    if ($scope.findCardIndex(response.data) === -1) {
                        $scope.cards.push($scope.convertCard(response.data));
                        $scope.addRandomCard(--depth, 0);
                    }
                    else {
                        $scope.addRandomCard(depth, ++tries);
                    }
                }, function errorCallback(response) {
                    $scope.errors.push(response);
            });
        }
    }
    
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
        if (scryCard.image_uris) {
            card.image_uri = scryCard.image_uris.png;
            card.image_uri_hover = scryCard.image_uris.png;
        }
        if (scryCard.card_faces) {
            if (scryCard.card_faces[0].image_uris) {
                card.image_uri = scryCard.card_faces[0].image_uris.png;
            }
            if (scryCard.card_faces[1].image_uris) {
                card.image_uri_hover = scryCard.card_faces[1].image_uris.png;
            }
            card.oracle_text = scryCard.card_faces[0].oracle_text + "\n//\n" + scryCard.card_faces[1].oracle_text;
            card.type_line = scryCard.card_faces[0].type_line + " // " + scryCard.card_faces[1].type_line;
            card.mana_cost = scryCard.card_faces[0].mana_cost + " // " + scryCard.card_faces[1].mana_cost;
        } else {
            card.mana_cost = scryCard.mana_cost;
            card.type_line = scryCard.type_line;
            card.oracle_text = scryCard.oracle_text;
        }
        card.colors = '.';
        for (var color of scryCard.color_identity) {
            card.colors += color;
        }
        card.colors += '.';
        card.colors = $scope.convertColor(card.colors);
        
        return card;
    }

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

    $scope.resetPage = function() {
        $scope.page = 0;
    };

    $scope.reset = function() {
        $scope.search = {};
        $scope.resetPage();
    }
    
    $scope.clear = function() {
        $scope.cards = [];
    }

    $scope.openScry = function(url) {
        $window.open(url, '_blank');
    }

    $scope.deleteCard = function(card) {
        $scope.cards.splice($scope.findCardIndex(card), 1);
    }

    $scope.addToDeck = function(card) {
        $scope.deck.push(card);
    }

    $scope.deleteFromDeck = function(index) {
        $scope.deck.splice(index, 1);
    }
    
    $scope.findCardIndex = function(card) {
        return $scope.cards.findIndex(x => x.name === card.name);
    }

    $scope.setSlideout = function(tab) {
        if ($scope.slideoutTab == tab) {
            $scope.slideoutTab = null;
        } else {
            $scope.slideoutTab = tab;
        }
    }
});