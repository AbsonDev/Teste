import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      "pantry": "My Pantry",
      "pantry_desc": "Manage your stock",
      "share": "Share",
      "lists_active": "Active",
      "lists_archived": "Archived",
      "empty_active": "No active lists",
      "empty_archived": "No archived lists",
      "cancel": "Cancel",
      "save": "Save",
      "confirm": "Confirm",
      "rename": "Rename",
      "archive": "Archive",
      "restore": "Restore",
      "delete_permanent": "Delete permanently",
      "new_list": "New List",
      "create_list": "Create List",
      "categories": "Categories",
      "history": "History",
      "theme_light": "Light Mode",
      "theme_dark": "Dark Mode",
      "logout": "Logout"
    }
  },
  pt: {
    translation: {
      "pantry": "Minha Dispensa",
      "pantry_desc": "Gerencie seu estoque",
      "share": "Compartilhar",
      "lists_active": "Ativas",
      "lists_archived": "Arquivadas",
      "empty_active": "Nenhuma lista ativa",
      "empty_archived": "Nenhuma lista arquivada",
      "cancel": "Cancelar",
      "save": "Salvar",
      "confirm": "Confirmar",
      "rename": "Renomear",
      "archive": "Arquivar",
      "restore": "Restaurar",
      "delete_permanent": "Excluir permanentemente",
      "new_list": "Nova Lista",
      "create_list": "Criar Lista",
      "categories": "Categorias",
      "history": "Histórico",
      "theme_light": "Modo Claro",
      "theme_dark": "Modo Escuro",
      "logout": "Sair"
    }
  },
  es: {
    translation: {
      "pantry": "Mi Despensa",
      "pantry_desc": "Gestionar inventario",
      "share": "Compartir",
      "lists_active": "Activas",
      "lists_archived": "Archivadas",
      "empty_active": "Sin listas activas",
      "empty_archived": "Sin listas archivadas",
      "cancel": "Cancelar",
      "save": "Guardar",
      "confirm": "Confirmar",
      "rename": "Renombrar",
      "archive": "Archivar",
      "restore": "Restaurar",
      "delete_permanent": "Eliminar permanentemente",
      "new_list": "Nueva Lista",
      "create_list": "Crear Lista",
      "categories": "Categorías",
      "history": "Historial",
      "theme_light": "Modo Claro",
      "theme_dark": "Modo Oscuro",
      "logout": "Cerrar sesión"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "pt", // default language
    fallbackLng: "pt",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;