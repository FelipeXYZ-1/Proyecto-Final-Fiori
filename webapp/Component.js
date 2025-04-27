// webapp/Component.js
sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel",
  "retofiori/userforms/model/models"
], (UIComponent, JSONModel, models) => {
  "use strict";

  const LANG_STORAGE_KEY = "ui5language";

  return UIComponent.extend("retofiori.userforms.Component", {
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]
    },

    init() {

      // --- INICIO: Establecer idioma ANTES de la inicialización ---
      const sSavedLang = localStorage.getItem(LANG_STORAGE_KEY);
      if (sSavedLang) {
          sap.ui.getCore().getConfiguration().setLanguage(sSavedLang);
      }
      // --- FIN: Establecer idioma ---
            
      // 1) Llamada al init base
      UIComponent.prototype.init.apply(this, arguments);
      this.setModel(models.createDeviceModel(), "device");

      // 2) Modelo principal (users + newUser)
      const oUserModel = new JSONModel({
        users: [],
        newUser: {
          id: "", typeDocument: "", numberDocument: "",
          firstName: "", lastName: "", birthDate: null,
          placeBirth: "", nationality: "", genre: "",
          civilStatus: "", country: "", province: "",
          region: "", address: "", postalCode: "",
          phoneNumber: "", email: ""
        }
      });
      this.setModel(oUserModel, "userModel");

      // 3) Modelo de listas estáticas
      const oListModel = new JSONModel({
        typeDocuments: [
          { key: "Z001", text: "Z001" },
          { key: "Z002", text: "Z002" },
          { key: "Z003", text: "Z003" }
        ],
        genres: [
          { key: "M", text: "Masculino" },
          { key: "F", text: "Femenino" },
          { key: "O", text: "Otro" }
        ],
        civilStatuses: [
          { key: "S", text: "Soltero" },
          { key: "C", text: "Casado" },
          { key: "D", text: "Divorciado" }
        ]
      });
      this.setModel(oListModel, "list");

      // 4) Modelo de países desde tu JSON externo
      const oCountryModel = new JSONModel();
      oCountryModel.setSizeLimit(300);
      const sUrl = sap.ui.require.toUrl("retofiori/userforms/model/countries.json");
      oCountryModel.loadData(sUrl);
      this.setModel(oCountryModel, "countries");

      // 5) Inicializamos el router
      this.getRouter().initialize();
    }
  });
});
