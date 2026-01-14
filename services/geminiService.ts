
import { GoogleGenAI, Type, FunctionDeclaration, Chat, GenerateContentResponse } from "@google/genai";
import { ShoppingItem, Recipe } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-3-flash-preview';

// Helper for Exponential Backoff Retry
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return callWithRetry(fn, retries - 1, delay * 2);
    }
};

export const generateSmartList = async (prompt: string, availableCategories: string[], pantryItems: string[] = []): Promise<Partial<ShoppingItem>[]> => {
  try {
    const categoriesStr = availableCategories.join(', ');
    const pantryStr = pantryItems.length > 0 ? pantryItems.join(', ') : "Nothing";

    // Use retry logic for the API call
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: `
      User Request: "${prompt}".
      
      Context - User's Current Pantry (Items they already have): [${pantryStr}].

      Task: Create a shopping list based on the user request.

      Logic Rules:
      1. RECIPE MODE: If the user asks for a dish/recipe (e.g., "Lasagna", "Carrot Cake", "Dinner for 2"), list ALL necessary ingredients BUT EXCLUDE items that are already in the Pantry context. Only list what is MISSING.
      2. DIRECT MODE: If the user explicitly lists items to buy (e.g., "Buy milk and eggs", "Soap, water"), IGNORE the Pantry and add them exactly as requested.
      3. Categorize every item into one of these exact categories: ${categoriesStr}. If uncertain, use "Outros".
      4. Translate item names to Portuguese if necessary.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "The name of the item to buy" },
              category: { type: Type.STRING, description: "The category of the item" },
              quantity: { type: Type.NUMBER, description: "Estimated quantity needed (default to 1)" }
            },
            required: ["name", "category"]
          }
        }
      }
    }));

    const jsonText = response.text;
    if (!jsonText) return [];

    // Robust JSON Parsing: Remove Markdown blocks if present
    const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsedItems = JSON.parse(cleanJson) as { name: string; category: string; quantity?: number }[];
    
    return parsedItems.map(item => ({
      name: item.name,
      category: item.category,
      quantity: item.quantity || 1,
      completed: false,
      createdAt: Date.now()
    }));

  } catch (error) {
    console.error("Error generating smart list:", error);
    throw error;
  }
};

export const suggestRecipesFromPantry = async (pantryItems: string[]): Promise<Recipe[]> => {
  if (pantryItems.length === 0) return [];
  
  try {
    const pantryStr = pantryItems.join(', ');

    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: `
      Context - User's Pantry Ingredients: [${pantryStr}].
      
      Task: Suggest 3 distinct recipes that can be made PRIMARILY using the ingredients in the pantry.
      
      Rules:
      1. Prioritize recipes where the user already has most ingredients.
      2. Identify which ingredients are 'used' (from pantry) and which are 'missing' (need to buy).
      3. Keep instructions very short (1 sentence summary).
      4. Language: Portuguese (Brazil).
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Name of the recipe" },
              time: { type: Type.STRING, description: "Preparation time, e.g., '30 min'" },
              difficulty: { type: Type.STRING, enum: ["Fácil", "Médio", "Difícil"] },
              usedIngredients: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of ingredients present in the pantry used in this recipe"
              },
              missingIngredients: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of essential ingredients missing from pantry"
              },
              instructionsShort: { type: Type.STRING, description: "A very brief summary of how to make it" }
            },
            required: ["title", "time", "difficulty", "usedIngredients", "missingIngredients", "instructionsShort"]
          }
        }
      }
    }));

    const jsonText = response.text;
    if (!jsonText) return [];
    
    const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson) as Recipe[];

  } catch (error) {
    console.error("Error generating recipes:", error);
    return [];
  }
};

// --- CHAT WITH TOOLS ---

const addItemsFunctionDeclaration: FunctionDeclaration = {
  name: 'addItemsToList',
  description: 'Adiciona novos itens à lista de compras.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        description: 'Lista de itens a serem adicionados',
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Nome do item' },
            category: { type: Type.STRING, description: 'Categoria aproximada' },
            quantity: { type: Type.NUMBER, description: 'Quantidade numérica' }
          },
          required: ['name', 'category']
        }
      }
    },
    required: ['items']
  }
};

const removeItemsFunctionDeclaration: FunctionDeclaration = {
  name: 'removeItemsFromList',
  description: 'Remove itens existentes da lista pelo nome (ex: "remova o arroz", "tire a carne").',
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemNames: {
        type: Type.ARRAY,
        description: 'Lista de nomes dos itens a serem removidos.',
        items: { type: Type.STRING }
      }
    },
    required: ['itemNames']
  }
};

const updateItemsFunctionDeclaration: FunctionDeclaration = {
  name: 'updateItemsInList',
  description: 'Atualiza itens existentes na lista (ex: "mude o arroz para 2kg", "troque maçã por pera").',
  parameters: {
    type: Type.OBJECT,
    properties: {
      updates: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            originalName: { type: Type.STRING, description: 'Nome atual do item na lista para identificar qual alterar' },
            newName: { type: Type.STRING, description: 'Novo nome do item (se for para renomear/trocar)' },
            newQuantity: { type: Type.NUMBER, description: 'Nova quantidade (se for para alterar quantidade)' }
          },
          required: ['originalName']
        }
      }
    },
    required: ['updates']
  }
};

export const startChatSession = (availableCategories: string[]): Chat => {
   const systemInstruction = `
    Você é um assistente pessoal de compras inteligente.
    Seu objetivo é gerenciar a lista de compras do usuário: adicionando, removendo ou editando itens.
    
    Regras:
    1. Seja prestativo, breve e amigável.
    2. Quando o usuário pedir para ADICIONAR, use 'addItemsToList'.
    3. Quando o usuário pedir para REMOVER/TIRAR, use 'removeItemsFromList'.
    4. Quando o usuário pedir para MUDAR/ALTERAR/TROCAR ou corrigir quantidade, use 'updateItemsInList'.
    5. Categorize os itens automaticamente baseando-se nestas categorias: ${availableCategories.join(', ')}. Use "Outros" se não tiver certeza.
    6. Sempre responda em Português do Brasil.
   `;

   return ai.chats.create({
     model: MODEL_NAME,
     config: {
       systemInstruction: systemInstruction,
       tools: [{ functionDeclarations: [addItemsFunctionDeclaration, removeItemsFunctionDeclaration, updateItemsFunctionDeclaration] }]
     }
   });
};