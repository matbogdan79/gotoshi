import ExampleGameControls from './example-controls';

const debug = require('debug')('gotoshi:gameController');

export default class GameController {
    constructor(game, wallet, $stateParams) {
        this.Game = game;
        this.wallet = wallet;
        this.client = {};
        this.tenuki = require('tenuki');

        /*if (data['moveNumber'] === client.moveNumber() + 1) {
         if (data['pass']) {
         client.receivePass();
         } else {
         client.receivePlay(data['y'], data['x']);
         }
         }
         if (data['phase'] === 'scoring') {
         client.setDeadStones(data['deadStones']);
         }*/

        this.Game.registerObserverCallback(this.gotMessage.bind(this));

        if(typeof $stateParams.pubKey !== 'undefined') {
            if(typeof this.Game.games[$stateParams.pubKey] === 'undefined') {
                this.Game.resetGame($stateParams.pubKey);
            }
            this.Game.setGame(this.Game.games[$stateParams.pubKey]);
        }
    }

    gotMessage(message) {
        debug('gotMessage', message);
        if (message.type === 'start') {
            let player = 'white';
            if (this.wallet.isOwnAddress(message.game.players.one)) player = 'black';
            this.resumeGame(player);
        } else if (message.type === 'pass') {
            this.client.receivePass();
        } else if (message.type === 'phase') {
            this.client.setDeadStones(message.deadStones);
        } else if (message.type === 'move') {
            debug('got move ' + message.move.n + ' and try to do move no ' + this.client.moveNumber() + '/' + this.Game.currentGame.moves.length);
            while (typeof this.Game.currentGame.moves[this.client.moveNumber()] !== 'undefined') {
                debug('do move no ' + this.client.moveNumber());
                this.client._game.playAt(this.Game.currentGame.moves[this.client.moveNumber()].y, this.Game.currentGame.moves[this.client.moveNumber()].x);
            }
        }
    }

    resetGame() {
        const boardElement = document.querySelector('.tenuki-board');
        boardElement.innerHTML = '';
        this.Game.resetGame();
    }

    resumeGame(player) {
        this.setupNewBoard(player);
    }

    startNewGame(player) {
        this.Game.startNewGame();
        //this.setupNewBoard(player);
    }

    setupNewBoard(player) {
        const boardElement = document.querySelector('.tenuki-board');
        boardElement.innerHTML = '';
        this.client = new this.tenuki.Client(boardElement);
        this.client.setup({
            player: player,
            gameOptions: {
                boardSize: 9
            },
            fuzzyStonePlacement: true,
            hooks: {
                submitPlay: (playedY, playedX, result) => {
                    this.Game.sendMove({ n: this.client.moveNumber(), p: this.client.currentPlayer(), y: playedY, x: playedX }).then(function() {
                        result(true); //data[result] ???
                    }, function() {
                        result(false);
                    });
                },
                submitMarkDeadAt: (y, x, stones, result) => {
                    this.Game.sendMarkDeadAt().then(function() {
                        result(true); //data[result] ???
                    }, function() {
                        result(false);
                    });
                },
                submitPass: (result) => {
                    this.Game.sendPass().then(function() {
                        result(true); //data[result] ???
                    }, function() {
                        result(false);
                    });
                }
            }
        });

        const controlElement = document.querySelector('.controls');
        const controls = new ExampleGameControls(controlElement, this.client._game);

        this.client._game.callbacks.postRender = function() {
            controls.updateStats();
        };
    }
}

GameController.$inject = ['game', 'wallet', '$stateParams'];