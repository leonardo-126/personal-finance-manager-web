import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import pt from "./locales/pt.json";

i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
  },
  lng: "pt", // único idioma do projeto
  fallbackLng: "pt", // fallback se faltar tradução
  supportedLngs: ["pt"], // só comunicamos em português por enquanto
  interpolation: {
    escapeValue: false, //react já faz isso
  },
});
export default i18n;
