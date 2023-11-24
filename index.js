const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

//  middleware
app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// middle wares
const verifyToken = async (req, res, next) => {
  const bearerToken = req.headers?.authorization;
  if (!bearerToken) {
    return res.status(401).send({ message: "unAuthorized" });
  }
  const token = bearerToken.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.status(403).send({ message: "forbidden access" });
    }

    req.decoded = decoded.email;
  });
  next();
};
// verify admin middleware
const verifyAdmin = async (req, res, next) => {
  const userEamil = req.decoded;
  const query = { email: userEamil };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

// ur starts here
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zav38m0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const menuCollection = client.db("bistro_bossDB").collection("menus");
const userCollection = client.db("bistro_bossDB").collection("users");
const reviewCollection = client.db("bistro_bossDB").collection("reviews");
const cartCollection = client.db("bistro_bossDB").collection("carts");
const paymentCollection = client.db("bistro_bossDB").collection("payments");

/* 
jwt api starts here
*/
app.post("/jwt", async (req, res) => {
  try {
    const user = req.body;
    const result = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "5h",
    });
    return res.send(result);
  } catch (err) {
    console.log(err);
  }
});

// user api starts here
app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    console.log("user from valid token", req.user);
    const result = await userCollection.find().toArray();
    return res.send(result);
  } catch (err) {
    console.log(err);
  }
});

// check use is admin or not
app.get("/users/admin/:email", verifyToken, async (req, res) => {
  try {
    const email = req.params.email;
    const userEmail = req.decoded;
    if (email !== userEmail) {
      return res.status(403).send({ message: "forbidden access" });
    }

    const query = {
      email: email,
    };
    const user = await userCollection.findOne(query);

    let admin = false;
    if (user) {
      admin = user.role === "admin";
    }
    return res.send({ admin });
  } catch (err) {
    console.log(err);
  }
});
app.post("/users", async (req, res) => {
  try {
    const user = req.body;
    const query = { email: user.email };
    const isExist = await userCollection.findOne(query);
    if (isExist) {
      return res.send({ message: "user already exist", insertedId: null });
    }
    const result = await userCollection.insertOne(user);
    return res.send(result);
  } catch (err) {
    console.log(err);
  }
});

app.delete("/users/:id", async (req, res) => {
  try {
    const id = req.params?.id;
    const query = { _id: new ObjectId(id) };
    const result = await userCollection.deleteOne(query);
    return res.send(result);
  } catch (err) {
    console.log(err);
  }
});

app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params?.id;
    const query = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: "admin",
      },
    };
    const result = await userCollection.updateOne(query, updatedDoc);
    return res.send(result);
  } catch (err) {
    console.log(err);
  }
});

/* 
menues apis starts
*/
app.get("/menus", async (req, res) => {
  try {
    const result = await menuCollection.find().toArray();
    return res.send(result);
  } catch (error) {
    console.log(error);
  }
});
app.get("/menus/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      _id: new ObjectId(id),
    };
    const result = await menuCollection.findOne(query);
    return res.send(result);
  } catch (error) {
    console.log(error);
  }
});

app.post("/menus", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const menu = req.body;
    console.log(menu);
    const result = await menuCollection.insertOne(menu);
    return res.send(result);
  } catch (err) {
    console.log(err);
  }
});

app.patch("/menus/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    console.log("patch");
    const id = req.params.id;
    const menu = req.body;
    const query = { _id: new ObjectId(id) };
    const options = { upsert: true };
    const updatedDoc = {
      $set: menu,
    };
    const result = await menuCollection.updateOne(query, updatedDoc, options);
    return res.send(result);
  } catch (err) {
    console.log(err);
  }
});

app.delete("/menus/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await menuCollection.deleteOne(query);
    return res.send(result);
  } catch (err) {
    console.log(err);
  }
});

/* 
  reviews apis start
  */
app.get("/reviews", async (req, res) => {
  try {
    const result = await reviewCollection.find().toArray();
    return res.send(result);
  } catch (error) {
    console.log(error);
  }
});
/* 
cart collection apis
*/
app.get("/carts", async (req, res) => {
  try {
    const email = req.query.email;
    const query = { email: email };
    const result = await cartCollection.find(query).toArray();
    return res.send(result);
  } catch (err) {
    console.log(err);
  }
});
app.post("/carts", async (req, res) => {
  try {
    const cartData = req.body;
    const result = await cartCollection.insertOne(cartData);
    return res.send(result);
  } catch (error) {
    console.log(error);
  }
});
app.delete("/cart/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await cartCollection.deleteOne(query);
  return res.send(result);
});

// PAYMENT RELATED API
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { price } = req.body;
    const amount = parseInt(price * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      payment_method_types: ["card"],
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.log(err);
  }
});

app.get("/payment/:email", verifyToken, async (req, res) => {
  try {
    const email = req.params?.email;
    const verifyEamil = req.decoded;
    if (email !== verifyEamil) {
      return res.status(403).send({ message: "forbidden access" });
    }
    const query = { email: email };
    const result = await paymentCollection.find(query).toArray();
    res.send(result);
  } catch (err) {
    console.log(err);
  }
});

app.post("/payment", async (req, res) => {
  try {
    const payment = req.body;
    console.log({payment});
    payment.menuItemIds= payment.menuItemIds.map((id) => new ObjectId(id))
    const result = await paymentCollection.insertOne(payment);
    // carefully delete each item on the cart
    const query = {
      _id: {
        $in: payment.cartIds.map((id) => new ObjectId(id)),
      },
    };
    const deletedResult = await cartCollection.deleteMany(query);
    res.send({ result, deletedResult });
  } catch (err) {
    console.log(err);
  }
});

// admin stats

app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
  const users = await userCollection.estimatedDocumentCount();
  const products = await menuCollection.estimatedDocumentCount();
  const orders = await paymentCollection.estimatedDocumentCount();
  // not the best way. There has better way to aggregate the price
  // const payments = await paymentCollection.find().toArray();
  // const revenue = payments.reduce((total, payment) => total + payment.price ,0)
  const result = await paymentCollection
    .aggregate([
      {
        $group: {
          _id: null,
          totalPrice: {
            $sum: "$price",
          },
        },
      },
    ])
    .toArray();
  const revenue = result.length > 0 ? result[0].totalPrice : 0;

  res.send({ users, products, orders, revenue });
});

// order stats
app.get("/order-stats", verifyToken, verifyAdmin, async (req, res) => {
  const result = await paymentCollection
    .aggregate([
      {
        $unwind: "$menuItemIds",
      },
      {
        $lookup: {
          from: 'menus',  
          localField: 'menuItemIds',
          foreignField: '_id',
          as: "menuItem",
        },
      },
      {
        $unwind: "$menuItem"
      },
      {
        $group:{
          _id:"$menuItem.category",
          quantity: {
            $sum:1
          },
          revenue:{$sum:"$menuItem.price"},

        }
      }, 
      {
        $project:{
          _id:0,
          category: "$_id",
          quantity: "$quantity",
          revenue: "$revenue"
        }
      }
    ])
    .toArray();
  res.send(result);
});

async function run() {
  try {
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// initail get api
app.get("/", async (req, res) => {
  return res.send("Bistro boss is running");
});

// port listening
app.listen(port, () => {
  console.log(`boss is running on port: ${port}`);
});
/**
 * -------------------------------
 *          Naming Convension
 * -------------------------------
 * app.get("/users")
 * app.get("/users/:id")
 * app.post("/users")
 * app.put("/users/:id")
 * app.delete("/users/:id")
 *
 *
 *
 *  */
