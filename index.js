const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o9jgoh4.mongodb.net/?retryWrites=true&w=majority`;
console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const userCollection = client
      .db("StudentClassDB")
      .collection("userCollection");
    const teacherCollection = client
      .db("StudentClassDB")
      .collection("teacherCollection");
    const classCollection = client
      .db("StudentClassDB")
      .collection("classCollection");

    // users related api
    app.post("/users", async (req, res) => {
      const user = req.body;

      // insert email if user doesnt exists:
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.post("/applyTeacher", async (req, res) => {
      const user = req.body;
      const result = await teacherCollection.insertOne(user);
      res.send(result);
    });

    app.post("/addClass", async (req, res) => {
      const user = req.body;
      const result = await classCollection.insertOne(user);
      res.send(result);
    });

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // middlewere
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      console.log(req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    });

     app.get("/user",  async (req, res) => {
        const email = req.query.email;
      const query = {email: email};
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/teacherRequest", async (req, res) => {
      const result = await teacherCollection.find().toArray();
      res.send(result);
    });

    app.get("/classes", async (req, res) => {
      const email = req.query.email;
      const query = {email: email};
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

     app.get("/allClass", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
     });
    
    //   app.get("/allAproveClass", async (req, res) => {
    //   const result = await classCollection.find().toArray();
    //   res.send(result);
    // });

    app.get("/update/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
      res.send(result);
    });

    app.put("/updateClass/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const result = await classCollection.updateOne(filter, {
        $set: req.body,
      });

      res.send(result);
    });

    app.delete("/class/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/teacher/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { email: email };
      const user = await teacherCollection.findOne(query);
      let teacher = false;
      if (user) {
        teacher = user?.role === "Teacher";
      }
      res.send({ teacher });
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    app.patch(
      "/admin/reqAccept/:email",
      verifyToken,
      verifyAdmin,

      async (req, res) => {
        const email= req.params.email;
        const filter = { email: email };
        const updatedDoc = {
          $set: {
            status: "Accept",
            role: "Teacher",
          },
        };
        const updatedDoc2 = {
          $set: {
            photo: "https://i.ibb.co/pWyg938/3135715.png",
            role: "Teacher",
          },
        };
        const result = await teacherCollection.updateOne(filter, updatedDoc);
        const result2 = await userCollection.updateOne(filter, updatedDoc2);
        res.send(result);
      }
    );
    app.patch(
      "/admin/reqReject/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            status: "Reject",
          },
        };
        const result = await teacherCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );
// classs accept and reject
       app.patch(
      "/admin/classReqAccept/:id",
      verifyToken,
      verifyAdmin,

      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            status: "Accepted"
          },
        };
        const result = await classCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );
    app.patch(
      "/admin/classReqReject/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            status: "Rejected",
          },
        };
        const result = await classCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`server runnung on port ${port}`);
});
