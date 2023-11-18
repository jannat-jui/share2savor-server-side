const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: [
    'https://share2savor.web.app',
    'https://share2savor.firebaseapp.com'
],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vgt34f5.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



// middlewares 
const logger = (req, res, next) => {
  console.log('log: info', req.method, req.url);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {

    const foodCollection = client.db('sharefoodDB').collection('food');
    const foodrequestcollection = client.db('sharefoodDB').collection('foodrequestcollection');

    // auth related api
    app.post('/jwt', logger, async (req, res) => {
      const user = req.body;
      console.log('user for token', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
       
      })
        .send({ success: true });
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('logging out', user);
      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })


    // add new food related api
    app.post('/food', verifyToken, async (req, res) => {
      const newfood = req.body;
      console.log(newfood);
      const result = await foodCollection.insertOne(newfood);
      res.send(result);
    })

    //http://localhost:5000/getallfood/v1?foodName=kacchi
    //http://localhost:5000/getallfood/v1?sortField=price&sortOrder=desc
    app.get('/getallfood/v1', async (req, res) => {

      let query = {}
      let sortObj = {}
      const foodName = req.query.foodName;
      const donaremail = req.query.donaremail;

      const sortField = req.query.sortField
      const sortOrder = req.query.sortOrder


      if (foodName) {
        query.foodName = foodName
      }
      if (donaremail) {
        query.donaremail = donaremail
      }

      if (sortField && sortOrder) {
        sortObj[sortField] = sortOrder
      }


      const cursor = foodCollection.find(query).sort(sortObj);
      const result = await cursor.toArray();
      res.send(result);
    })

    //   app.get('/getallfood/v1', async (req, res) => {
    //     const cursor = foodCollection.find();
    //     const result = await cursor.toArray();
    //     res.send(result);
    //   })

    app.get('/getallfood/v1/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await foodCollection.findOne(query);
      res.send(result);
    })

    app.put('/getallfood/v1/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedproduct = req.body;

      const product = {
        $set: {
          foodName: updatedproduct.foodName,
          foodImage: updatedproduct.foodImage,
          foodquantity: updatedproduct.foodquantity,
          pickuplocation: updatedproduct.pickuplocation,
          expiredate: updatedproduct.expiredate,
          foodstatus: updatedproduct.foodstatus,
          donarname: updatedproduct.donarname,
          donarimage: updatedproduct.donarimage,
          donaremail: updatedproduct.donaremail,
          additionalnotes: updatedproduct.additionalnotes
        }
      }

      const result = await foodCollection.updateOne(filter, product, options);
      res.send(result);
    })

    app.patch('/getallfood/v1/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updatedBooking = req.body;

      const updateDoc = {
        $set: {
          foodstatus: updatedBooking.foodstatus
        },
      }
      const result = await foodCollection.updateOne(filter, updateDoc)
      res.send(result)
      
    })

    app.delete('/getallfood/v1/:id', async (req, res) => {
      try{
        const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.deleteOne(query);
      res.send(result);
      }
      catch(err){
        console.log(err)
      }
    })

    // food request collection 

    app.post('/foodrequestcollection/v1', async (req, res) => {
      const newfood = req.body;
      console.log(newfood);
      const result = await foodrequestcollection.insertOne(newfood);
      res.send(result);
    })

    app.get('/foodrequestcollection/v1', verifyToken, async (req, res) => {

      let query = {}
      
      const foodId = req.query.foodId;
      const useremail = req.query.useremail;
      if (foodId) {
        query.foodId = foodId
      }
      if (useremail) {
        query.useremail = useremail
      }
      const cursor = foodrequestcollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.patch('/foodrequestcollection/v1/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updatedBooking = req.body;

      const updateDoc = {
        $set: {
          foodstatus: updatedBooking.foodstatus
        },
      }
      const result = await foodrequestcollection.updateOne(filter, updateDoc)
      res.send(result)
      
    })


    app.delete('/foodrequestcollection/v1/:id', async (req, res) => {
      try{
        const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodrequestcollection.deleteOne(query);
      res.send(result);
      }
      catch(err){
        console.log(err)
      }
    })






    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('food donation server is running')
})

app.listen(port, () => {
  console.log(`food donation is running on port: ${port}`)
})