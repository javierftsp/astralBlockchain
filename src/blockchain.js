/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if (this.height === -1) {
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        const self = this;
        return new Promise(async (resolve, reject) => {
            block.height = self._getChainLength();
            block.time = self._getCurrentTime();
            block.previousBlockHash = self._getPreviousHash();
            block.hash = block.calculateHash();

            let errors = await self.validateChain();

            if (errors.length === 0) {
                self.chain.push(block);
                self.height++;
                resolve(block)
            } else {
                reject(errors);
            }
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        const self = this
        return new Promise((resolve) => {
            const currentTime = self._getCurrentTime();
            const messageData = JSON.stringify({
                'address': address,
                'time': currentTime
            });
            const message = Buffer.from(messageData).toString('base64');
            resolve(message);
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        const self = this;
        return new Promise(async (resolve, reject) => {
            if (self._isMessageExpired(message)) {
                reject(Error("Timeout: request expires after 5 minutes"));
                return
            }

            try {
                if (bitcoinMessage.verify(message, address, signature)) {
                    let block = new BlockClass.Block({"owner":address, "star":star});
                    try {
                        await self._addBlock(block);
                        resolve(block);
                    } catch(errors) {
                        reject(errors.join());
                    }
                } else {
                    reject(Error("Invalid signature"));
                }
            } catch(error) {
                reject(error);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        const self = this;
        return new Promise((resolve, reject) => {
            const block = self.chain.find(b => b.hash === hash);
            if (block) {
                resolve(block);
            } else {
                reject(Error("Block not found."));
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        const self = this;
        return new Promise((resolve, reject) => {
            const block = self.chain.find(b => b.height === height);
            if (block) {
                resolve(block);
            } else {
                reject(Error("Block not found."));
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        const self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            self.chain.forEach( async(b) => {
                const data = await b.getBData();
                if (data && data.owner === address) {
                    stars.push(data);
                }
            })
            resolve(stars);
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        const self = this;
        let errors = [];
        let promises = [];
        return new Promise(async (resolve, reject) => {
            self.chain.forEach((block, index) => {
                if (index > 0) {
                    const previousBlockHash = self.chain[index - 1].hash
                    if (block.previousBlockHash !== previousBlockHash) {
                        errors.push(`Invalid previous hash in block ${index}`);
                    }
                }
                promises.push(block.validate());
            });

            Promise.all(promises).then(results => {
                results.forEach((valid, index) => {
                    if (!valid) {
                        errors.push(`Invalid hash in block ${index}`);
                    }
                });
                resolve(errors);
            });
        });
    }

    _getChainLength() {
        return this.chain.length;
    }

    _getCurrentTime() {
        return new Date().getTime().toString().slice(0,-3);
    }

    _getPreviousHash() {
        if (this.chain.length > 0) {
            return this.chain[this.chain.length-1].hash;
        }
        return null;
    }

    _isMessageExpired(message) {
        const messageData = JSON.parse(Buffer.from(message, 'base64').toString());
        const messageTime = parseInt(messageData.time, 10);
        const currentTime = parseInt(this._getCurrentTime(), 10);

        return (currentTime-messageTime) > (5*60);
    }

}

module.exports.Blockchain = Blockchain;   