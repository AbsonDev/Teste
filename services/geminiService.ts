import { GoogleGenAI, Type, FunctionDeclaration, Chat } from "@google/genai";
import { ShoppingItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-3-flash-preview';

export const generateSmartList = async (prompt: string, availableCategories: string[]): Promise<Partial<ShoppingItem>[]> => {
  try {
    const categoriesStr = availableCategories.join(', ');

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `User request: "${prompt}". 
      
      Task: Extract a list of shopping items from the user request. 
      If the user asks for a recipe (e.g., "ingredients for carrot cake"), list the necessary ingredients.
      
      Categorization Rules:
      1. Assign one of the following exact category names to each item: ${categoriesStr}.
      2. If an item doesn't fit well, use the category "Outros" (or similar general category from the list provided).
      3. Translate item names to Portuguese if they are in another language.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "The name of the item" },
              category: { type: Type.STRING, description: "The category of the item (must be one of the provided options)" }
            },
            required: ["name", "category"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const parsedItems = JSON.parse(jsonText) as { name: string; category: string }[];
    
    return parsedItems.map(item => ({
      name: item.name,
      category: item.category,
      completed: false,
      createdAt: Date.now()
    }));

  } catch (error) {
    console.error("Error generating smart list:", error);
    throw error;
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