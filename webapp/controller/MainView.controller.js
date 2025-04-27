sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/Theming", // Importación para Theming
  "sap/ui/model/resource/ResourceModel" // Importación para i18n (opcional, pero útil si necesitas textos aquí)
], (Controller, MessageToast, Filter, FilterOperator, Theming, ResourceModel) => { // Añadir parámetros correspondientes
  "use strict";

  // Constantes para localStorage y temas/idiomas
  const THEME_STORAGE_KEY = "ui5theme";
  const LANG_STORAGE_KEY = "ui5language";
  const LIGHT_THEME = "sap_horizon"; 
  const DARK_THEME = "sap_horizon_dark";

  return Controller.extend("retofiori.userforms.controller.MainView", {

    onInit() {
      // --- Carga de datos de usuario (tu código existente) ---
      const oModel = this.getOwnerComponent().getModel("userModel");
      const sSavedUsers = localStorage.getItem("usersData");
      if (sSavedUsers) {
        try {
          const oSaved = JSON.parse(sSavedUsers);
          oModel.setProperty("/users", oSaved.users || []);
        } catch (e) {
          console.error("Error parseando usersData:", e);
        }
      }
      // Aseguramos newUser vacío
      oModel.setProperty("/newUser", {
        id: "", typeDocument: "", numberDocument: "", firstName: "", lastName: "",
        birthDate: null, placeBirth: "", nationality: "", genre: "", civilStatus: "",
        country: "", province: "", region: "", address: "", postalCode: "",
        phoneNumber: "", email: ""
      });
      // --- Fin de carga de datos de usuario ---


      // --- Cargar y aplicar tema guardado ---
      const sSavedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (sSavedTheme) {
          Theming.setTheme(sSavedTheme);
          // Usamos un pequeño delay por si la vista no está lista inmediatamente
          setTimeout(() => { 
             const oSwitch = this.byId("themeSwitch");
             if (oSwitch) {
                 oSwitch.setState(sSavedTheme === DARK_THEME);
             }
          }, 0);
      } else {
           Theming.setTheme(LIGHT_THEME); // Tema claro por defecto
      }
      // --- Fin Cargar y aplicar tema guardado ---


      // --- Ajustar selector de idioma según preferencia guardada ---
      // (Se ejecuta después de que el Component.js ya ha establecido el idioma inicial)
      const sSavedLang = localStorage.getItem(LANG_STORAGE_KEY);
      const oLangSelect = this.byId("languageSelect");
      if (sSavedLang && oLangSelect) {
          // Pequeño delay por si el control no está listo al instante
          setTimeout(() => { oLangSelect.setSelectedKey(sSavedLang); }, 0);
      } else if (oLangSelect) {
          // Si no hay nada guardado, asegurar que marque el idioma por defecto actual
          const sCurrentLang = sap.ui.getCore().getConfiguration().getLanguage().slice(0, 2);
          setTimeout(() => { oLangSelect.setSelectedKey(sCurrentLang || "en"); }, 0); // Default a 'en' si todo falla
      }
       // --- Fin Ajustar selector de idioma ---
    },

    /**
     * Cambia el tema de la aplicación y guarda la preferencia.
     */
    onThemeSwitchChange: function(oEvent) {
        const bDarkMode = oEvent.getParameter("state"); 
        const sCurrentTheme = bDarkMode ? DARK_THEME : LIGHT_THEME;
        Theming.setTheme(sCurrentTheme);
        localStorage.setItem(THEME_STORAGE_KEY, sCurrentTheme);
    },

    /**
     * Cambia el idioma de la aplicación, guarda preferencia y recarga.
     */
    onLanguageSelect: function(oEvent) {
        const sSelectedLang = oEvent.getParameter("item").getKey(); // "en" o "es"
        localStorage.setItem(LANG_STORAGE_KEY, sSelectedLang);
        // Establecer el idioma antes de recargar (aunque Component.js lo leerá al inicio)
        sap.ui.getCore().getConfiguration().setLanguage(sSelectedLang); 
        window.location.reload(); 
    },

    /**
     * Añade un nuevo usuario a la lista y al localStorage.
     */
    onAddUser() {
      const oModel = this.getOwnerComponent().getModel("userModel");
      const oNew = oModel.getProperty("/newUser");
      const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();

      // Validar TODOS los campos obligatorios
      const aRequired = [ /* ... tu array de campos ... */ ];
      for (let sField of aRequired) {
        if (!oNew[sField]) {
          // Usar i18n para mensajes
          const sMsg = oResourceBundle.getText("requiredFieldMsg", [sField]); // Pasar el nombre del campo
          MessageToast.show(sMsg); 
          return;
        }
      }

      // Push y persistencia
      const aUsers = oModel.getProperty("/users");
      aUsers.push(Object.assign({}, oNew)); 
      oModel.setProperty("/users", aUsers); 
      oModel.refresh(true); 
      localStorage.setItem("usersData", JSON.stringify({ users: aUsers })); 
      MessageToast.show(oResourceBundle.getText("userAddedMsg")); // Mensaje i18n

      // Limpiar formulario
      oModel.setProperty("/newUser", { /* ... objeto vacío ... */ });
    },

    /**
     * Filtra la tabla de usuarios.
     */
    onFilterUsers(oEvt) {
      const sQuery = oEvt.getParameter("newValue");
      const oTable = this.byId("tblUsers");
      const oBinding = oTable.getBinding("items");
      const aFilters = [];

      if (sQuery) {
        aFilters.push(new Filter({
          filters: [ /* ... tus filtros ... */ ],
          and: false 
        }));
      }
      oBinding.filter(aFilters);
    },

    /**
     * Elimina un usuario de la lista y del localStorage.
     */
    onDeleteUser(oEvt) {
      const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
      const sPath = oEvt.getSource().getBindingContext("userModel").getPath(); 
      const iIndex = parseInt(sPath.split("/").pop(), 10); 

      const oModel = this.getOwnerComponent().getModel("userModel");
      const aUsers = oModel.getProperty("/users");

      if (iIndex >= 0 && iIndex < aUsers.length) {
        aUsers.splice(iIndex, 1); 
        oModel.refresh(true); 
        localStorage.setItem("usersData", JSON.stringify({ users: aUsers })); 
        MessageToast.show(oResourceBundle.getText("userDeletedMsg")); // Mensaje i18n
      } else {
         console.error("Error al obtener índice para borrar usuario:", sPath);
         MessageToast.show(oResourceBundle.getText("errorDeletingUserMsg")); // Mensaje i18n
      }
    },

    /**
     * Exporta la lista de usuarios a CSV.
     */
    onExportCsv: function () {
      // (Usando el código mejorado de la respuesta anterior con delimitador ';')
      const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
      var oModel = this.getView().getModel("userModel") || this.getOwnerComponent().getModel("userModel");
      if (!oModel) {
          MessageToast.show(oResourceBundle.getText("errorModelNotFoundMsg"));
          return;
      }
      var aUsers = oModel.getProperty("/users");

      if (!aUsers || !aUsers.length) {
          MessageToast.show(oResourceBundle.getText("noUsersToExportMsg"));
          return;
      }
      // ... (resto del código de onExportCsv como lo tenías en la respuesta anterior) ...
       var aHeaders = [ /* ... tus headers ... */ ];
       var sDelimiter = ";"; 
       var sCsvContent = "";
       sCsvContent += "\ufeff"; // BOM

       var fnQuoteField = function(sField) { /* ... tu función fnQuoteField ... */ };

       sCsvContent += aHeaders.map(fnQuoteField).join(sDelimiter) + "\r\n"; // Cabecera

       aUsers.forEach(function (oUser) { // Datos
           var aValues = aHeaders.map(function (sKey) { /* ... tu lógica de mapeo ... */ });
           sCsvContent += aValues.join(sDelimiter) + "\r\n";
       });
       
       // Descarga
       try {
           var oBlob = new Blob([sCsvContent], { type: "text/csv;charset=utf-8;" });
           var sUrl = URL.createObjectURL(oBlob);
           var oLink = document.createElement("a");
           oLink.href = sUrl;
           oLink.download = "users.csv";
           document.body.appendChild(oLink);
           oLink.click();
           document.body.removeChild(oLink);
           URL.revokeObjectURL(sUrl);
       } catch (e) {
           console.error("Error al crear o descargar el CSV:", e);
           MessageToast.show(oResourceBundle.getText("errorExportMsg"));
       }
    } // Fin de onExportCsv

  }); // Fin de Controller.extend
}); // Fin de sap.ui.define