const express = require('express');
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
const port = process.env.PORT;
const app = express();

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jxgrj34.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({error:true, message: "unauthorized access"})
    }

    const token = authorization.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(403).send({ error: true, message: "unauthorized access" })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {

    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const services = client.db("carDoctor").collection("services");
        const orders = client.db("carDoctor").collection("orders");

        //jwt 
        app.post('/jwt', (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({token})
        })

        //services routes
        app.get('/services', async (req, res) => {            
            const options = {
                projection: { img: 1, title: 1, price: 1 },
            };
            const result = await services.find({}, options).toArray(); // {} has been used in the place of query
            res.send(result)
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const options = {
                projection: { img: 1, title: 1, price: 1 },
            };
            const result = await services.findOne({_id: new ObjectId(id)}, options);
            res.send(result)
        })


        // orders routes
        app.get('/orders', verifyJWT, async (req, res) => {
            if (req.decoded.email !== req.query?.email) {
                res.status(403).send({error:1 , message: "forbidden access"})
            }

            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }

            const result = await orders.find(query).toArray(); // {} has been used in the place of query
            res.send(result)
        })

        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const options = {
                projection: { img: 1, title: 1, price: 1 },
            };
            const result = await orders.findOne({ _id: new ObjectId(id) }, options);
            res.send(result)
        })

        app.post('/orders', async (req, res) => {
            const newOrder = req.body;
            const result = await orders.insertOne(newOrder);
            res.send(result);
        })

        app.patch('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateOrder = {
                $set:{
                    status : req.body.status
                }
            }
            const result = await orders.updateOne(filter, updateOrder);
            res.send(result);
        })

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const result = await orders.deleteOne({_id: new ObjectId(id)});
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send({message : "Server is running"})
})

app.listen(port, () => {
    console.log(`Server is running on port : ${port}`);
})
