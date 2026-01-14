
export type CategoryName = 
  | 'Frutas e Verduras' 
  | 'Laticínios' 
  | 'Carnes' 
  | 'Padaria' 
  | 'Limpeza' 
  | 'Outros' 
  | 'Bebidas'; // Bebidas is commonly mapped to Outros if not in DEFAULT_CATEGORIES, but good to have in DB

export const ITEM_DATABASE: Record<string, CategoryName> = {
  // Frutas e Verduras
  'banana': 'Frutas e Verduras',
  'maçã': 'Frutas e Verduras',
  'uva': 'Frutas e Verduras',
  'batata': 'Frutas e Verduras',
  'cenoura': 'Frutas e Verduras',
  'cebola': 'Frutas e Verduras',
  'tomate': 'Frutas e Verduras',
  'alface': 'Frutas e Verduras',
  'limão': 'Frutas e Verduras',
  'alho': 'Frutas e Verduras',
  'abacate': 'Frutas e Verduras',
  'mamão': 'Frutas e Verduras',
  'laranja': 'Frutas e Verduras',
  'morango': 'Frutas e Verduras',
  'brócolis': 'Frutas e Verduras',
  'pimentão': 'Frutas e Verduras',
  'couve': 'Frutas e Verduras',

  // Laticínios
  'leite': 'Laticínios',
  'queijo': 'Laticínios',
  'mussarela': 'Laticínios',
  'manteiga': 'Laticínios',
  'margarina': 'Laticínios',
  'iogurte': 'Laticínios',
  'requeijão': 'Laticínios',
  'creme de leite': 'Laticínios',
  'leite condensado': 'Laticínios',
  'yakult': 'Laticínios',

  // Carnes
  'frango': 'Carnes',
  'filé de frango': 'Carnes',
  'carne moída': 'Carnes',
  'bife': 'Carnes',
  'peixe': 'Carnes',
  'linguiça': 'Carnes',
  'salsicha': 'Carnes',
  'presunto': 'Carnes',
  'bacon': 'Carnes',
  'costela': 'Carnes',
  'carne de porco': 'Carnes',

  // Padaria
  'pão': 'Padaria',
  'pão de forma': 'Padaria',
  'pão francês': 'Padaria',
  'bolo': 'Padaria',
  'biscoito': 'Padaria',
  'bolacha': 'Padaria',
  'sonho': 'Padaria',
  'torrada': 'Padaria',

  // Limpeza
  'detergente': 'Limpeza',
  'sabão em pó': 'Limpeza',
  'amaciante': 'Limpeza',
  'água sanitária': 'Limpeza',
  'desinfetante': 'Limpeza',
  'esponja': 'Limpeza',
  'papel higiênico': 'Limpeza',
  'sabonete': 'Limpeza',
  'pasta de dente': 'Limpeza',
  'shampoo': 'Limpeza',
  'condicionador': 'Limpeza',
  'álcool': 'Limpeza',

  // Outros (Bebidas e Mercearia mapeados para Outros se não houver categoria específica no types.ts)
  'arroz': 'Outros',
  'feijão': 'Outros',
  'macarrão': 'Outros',
  'café': 'Outros',
  'açúcar': 'Outros',
  'sal': 'Outros',
  'óleo': 'Outros',
  'azeite': 'Outros',
  'farinha': 'Outros',
  'ovo': 'Laticínios', // Culturalmente muitas vezes fica perto
  'cerveja': 'Outros',
  'refrigerante': 'Outros',
  'suco': 'Outros',
  'água': 'Outros'
};