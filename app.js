const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb'); // Import ObjectId from MongoDB
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI;

app.post('/:collection/:id', async (req, res) => {
  const collectionName = req.params.collection;
  const id = req.params.id;
  const updateFields = req.body; // JSON data containing fields to update

  try {
    const objectId = ObjectId(id);
    const client = await MongoClient.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db(); // Get the database instance

    const collection = db.collection(collectionName);

    // Construct the update operation
    const updateOperation = {
      $set: updateFields, // Use $set to specify fields to update
    };

    // Perform the update operation
    const updateResult = await collection.updateOne({ _id: objectId }, updateOperation);

    client.close();

    if (updateResult.modifiedCount === 0) {
      res.status(304).json({ message: "Not modified" });
    } else {
      const responseMessage = `Success`;
      res.status(200).json({ message: responseMessage });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Define the route for resetting page-level progress
app.get('/resetPageLevelProgress', async (req, res) => {
  const courseId = req.query['course-id'];

  try {
    // Convert the courseId string to a valid ObjectId
    const courseObjectId = ObjectId(courseId);

    const client = await MongoClient.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db(); // Get the database instance

    // Run the MongoDB update queries and capture the result
    const componentsUpdateResult = await db.collection('components').updateMany(
      { "_courseId": courseObjectId, "_extensions._pageLevelProgress._isEnabled": true },
      { $set: { "_extensions._pageLevelProgress._isEnabled": false } }
    );

    const blocksUpdateResult = await db.collection('blocks').updateMany(
      { "_courseId": courseObjectId, "_extensions._pageLevelProgress._isEnabled": false },
      { $set: { "_extensions._pageLevelProgress._isEnabled": true } }
    );

    client.close(); // Close the MongoDB connection

    // Prepare the response with the count of updated documents
    const responseMessage = `Page-level progress reset successfully. Components updated: ${componentsUpdateResult.modifiedCount}, Blocks updated: ${blocksUpdateResult.modifiedCount}`;
    res.status(200).json({ message: responseMessage });
  } catch (error) {
    console.error('Error resetting page-level progress:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
