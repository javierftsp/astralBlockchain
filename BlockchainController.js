/**
 *          BlockchainController
 *       (Do not change this code)
 * 
 * This class expose the endpoints that the client applications will use to interact with the 
 * Blockchain dataset
 */
class BlockchainController {

    //The constructor receive the instance of the express.js app and the Blockchain class
    constructor(app, blockchainObj) {
        this.app = app;
        this.blockchain = blockchainObj;
        // All the endpoints methods needs to be called in the constructor to initialize the route.
        this.getBlockByHeight();
        this.requestOwnership();
        this.submitStar();
        this.getBlockByHash();
        this.getStarsByOwner();
    }

    // Enpoint to Get a Block by Height (GET Endpoint)
    getBlockByHeight() {
        this.app.get("/block/height/:height", async (req, res) => {
            if (!req.params.height) {
                return res.status(400).send("Bad API Parameters.");
            }
            const height = parseInt(req.params.height);
            try {
                const block = await this.blockchain.getBlockByHeight(height);
                return res.status(200).json(block);
            } catch (error) {
                return res.status(500).send(error.message);
            }
        });
    }

    // This endpoint allows you to retrieve the block by hash (GET endpoint)
    getBlockByHash() {
        this.app.get("/block/hash/:hash", async (req, res) => {
            if (!req.params.hash) {
                return res.status(400).send("Bad API Parameters.");
            }
            const hash = req.params.hash;
            try {
                const block = await this.blockchain.getBlockByHash(hash);
                return res.status(200).json(block);
            } catch (error) {
                return res.status(500).send(error.message);
            }
        });
    }

    // Endpoint that allows user to request Ownership of a Wallet address (POST Endpoint)
    requestOwnership() {
        this.app.post("/requestValidation", async (req, res) => {
            if (!req.body.address) {
                return res.status(400).send("Bad API Parameters.");
            }
            const address = req.body.address;
            try {
                const message = await this.blockchain.requestMessageOwnershipVerification(address);
                return res.status(200).json(message);
            } catch (error) {
                return res.status(500).send(error.message);
            }
        });
    }

    // Endpoint that allow Submit a Star, yu need first to `requestOwnership` to have the message (POST endpoint)
    submitStar() {
        this.app.post("/submitstar", async (req, res) => {
            if (!req.body.address || !req.body.message || !req.body.signature || !req.body.star) {
                return res.status(400).send("Bad API Parameters.");
            }
            const address = req.body.address;
            const message = req.body.message;
            const signature = req.body.signature;
            const star = req.body.star;
            try {
                let block = await this.blockchain.submitStar(address, message, signature, star);
                if(block){
                    return res.status(200).json(block);
                } else {
                    return res.status(404).send("An error happened!");
                }
            } catch (error) {
                return res.status(500).send(error.message);
            }
        });
    }

    // This endpoint allows you to request the list of Stars registered by an owner
    getStarsByOwner() {
        this.app.get("/blocks/:address", async (req, res) => {
            if (!req.params.address) {
                return res.status(400).send("Bad API Parameters.");
            }
            const address = req.params.address;
            try {
                let stars = await this.blockchain.getStarsByWalletAddress(address);
                return res.status(200).json(stars);
            } catch (error) {
                return res.status(500).send(error.message);
            }
        });
    }

}

module.exports = (app, blockchainObj) => { return new BlockchainController(app, blockchainObj);}