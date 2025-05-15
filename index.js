const express = require('express');
const { GoogleGenAI } = require("@google/genai");
const { jsonrepair } = require('jsonrepair');

const app = express();
const port = 3001;
const cors = require('cors');

app.use(cors("*"));
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: "AIzaSyBhppoYCRl2KCkSPvdW67eCaRzRoy0P64E" });


app.get('/', (req, res) => {
  console.log("Server is running");
  res.send('Hello World!');
});

app.post('/recipe', async (req, res) => {
  const { foodItem } = req.body;

  if (!foodItem) {
    return res.status(400).json({ error: 'Missing "foodItem" in request body' });
  }

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Create a recipe using ${foodItem} with bullet point short instructions, also give Nutrition Fact Points related to the specified food item, Be specific, don't give anyother recipe which is combined. Respond ONLY in raw JSON (no explanation). Format: {"name": ..., "ingredients": [...], "instructions": [...], "factsPoints": [...]}`,
      temperature: 0.5,
    });

    let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    text = text.replace(/```json|```/g, '').trim();

    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not extract JSON from model response' });
    }

    const repairedJson = jsonrepair(jsonMatch[0]);
    const recipe = JSON.parse(repairedJson);
    console.log(recipe);
    res.json(recipe);
  } catch (error) {
    console.error("Error generating recipe:", error.message);
    res.status(500).json({ error: 'Failed to generate valid JSON recipe' });
  }
});

app.post('/suggestion', async (req, res) => {
  const { ingredients } = req.body;

  if (!ingredients) {
    return res.status(400).json({ error: 'Missing "ingredients" in request body' });
  }

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `I have the following ingredients: ${ingredients}. List at least 10 different possible dishes I can make using them. Respond ONLY in raw JSON format, no explanation. Format: {"Suggestion": [{"name": "Dish Name", "type": "(Vegetarian/non-vegetarian)"}]}. Return as many valid options as possible.`,
      temperature: 0.7,
    });

    let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    text = text.replace(/```json|```/g, '').trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not extract JSON from model response' });
    }

    const repairedJson = jsonrepair(jsonMatch[0]);
    const suggestion = JSON.parse(repairedJson);
    console.log(suggestion);
    res.json(suggestion);
  } catch (error) {
    console.error("Error generating suggestion:", error.message);
    res.status(500).json({ error: 'Failed to generate valid JSON suggestion' });
  }
});
 
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});