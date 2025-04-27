sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/Theming",
  "sap/ui/model/resource/ResourceModel"
], (Controller, MessageToast, Filter, FilterOperator, Theming, ResourceModel) => {
  "use strict";

  // Constantes para localStorage y temas/idiomas
  const THEME_STORAGE_KEY = "ui5theme";
  const LANG_STORAGE_KEY = "ui5language";
  const LIGHT_THEME = "sap_horizon";
  const DARK_THEME = "sap_horizon_dark";

  return Controller.extend("retofiori.userforms.controller.MainView", {

    onInit() {
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
        birthDate: "", placeBirth: "", nationality: "", genre: "", civilStatus: "",
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
    onThemeSwitchChange: function (oEvent) {
      const bDarkMode = oEvent.getParameter("state");
      const sCurrentTheme = bDarkMode ? DARK_THEME : LIGHT_THEME;
      Theming.setTheme(sCurrentTheme);
      localStorage.setItem(THEME_STORAGE_KEY, sCurrentTheme);
    },

    /**
     * Cambia el idioma de la aplicación, guarda preferencia y recarga.
     */
    onLanguageSelect: function (oEvent) {
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
      const aRequired = [
        "id", "typeDocument", "numberDocument", "firstName", "lastName", "birthDate",
        "placeBirth", "nationality", "genre", "civilStatus",
        "country", "province", "region", "address", "postalCode",
        "phoneNumber", "email"];
      for (let sField of aRequired) {
        if (!oNew[sField]) {
          // 1. Construir la clave i18n para la etiqueta del campo
          const sLabelKey = sField + "Label";

          // 2. Obtener el texto traducido de la etiqueta
          let sFieldLabel = oResourceBundle.getText(sLabelKey)

          // 3. Obtener el mensaje de error y pasarle la etiqueta traducida como parámetro
          const sMsg = oResourceBundle.getText("requiredFieldMsg", [sFieldLabel]);

          MessageToast.show(sMsg);
          return; // Detener si falta un campo
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
      oModel.setProperty("/newUser", {
        id: "", typeDocument: "", numberDocument: "", firstName: "", lastName: "",
        birthDate: "", placeBirth: "", nationality: "", genre: "", civilStatus: "",
        country: "", province: "", region: "", address: "", postalCode: "",
        phoneNumber: "", email: ""
      });
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
          filters: [
            new Filter("firstName", FilterOperator.Contains, sQuery),
            new Filter("lastName", FilterOperator.Contains, sQuery),
            new Filter("numberDocument", FilterOperator.Contains, sQuery)
          ],
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
         * Exporta la lista de usuarios a CSV (Versión Definitiva y Limpia).
         */
    onExportCsv: function () {
      // Obtener ResourceBundle para mensajes traducidos
      const oResourceBundle = this.getView().getModel("i18n")?.getResourceBundle();
      // Helper para mostrar mensajes (usa i18n si está disponible)
      const fnShowMessage = (sMsgKey, sDefaultText) => {
        const sMsg = oResourceBundle ? oResourceBundle.getText(sMsgKey) : sDefaultText;
        MessageToast.show(sMsg);
      };

      // Obtener Modelo y Datos
      const oModel = this.getView().getModel("userModel") || this.getOwnerComponent().getModel("userModel");
      if (!oModel) {
        fnShowMessage("errorModelNotFoundMsg", "Error: User model not found.");
        return;
      }
      // Obtener una COPIA de los datos para no modificar el modelo original accidentalmente
      const aUsers = oModel.getProperty("/users") ? JSON.parse(JSON.stringify(oModel.getProperty("/users"))) : [];

      if (!aUsers || !aUsers.length) {
        fnShowMessage("noUsersToExportMsg", "No users to export");
        return;
      }

      // 1. Definir Cabeceras (claves del modelo)
      const aHeaders = [
        "id", "typeDocument", "numberDocument", "firstName", "lastName",
        "birthDate", "placeBirth", "nationality", "genre", "civilStatus",
        "country", "province", "region", "address", "postalCode",
        "phoneNumber", "email"
      ];

      const sDelimiter = ";"; // Punto y coma para compatibilidad Excel
      let sCsvContent = "\ufeff"; // BOM para UTF-8 Excel

      // 2. Función robusta para formatear y escapar celdas CSV
      const fnFormatCell = (value) => {
        let sValue = (value === null || value === undefined) ? "" : String(value);
        // Escapar comillas dobles internas reemplazándolas por dos comillas dobles
        sValue = sValue.replace(/"/g, '""');
        // Siempre encerrar el valor entre comillas dobles
        return '"' + sValue + '"';
      };

      // 3. Añadir Fila de Cabecera (con claves i18n si las tuvieras para cabeceras)
      // Por simplicidad, usamos las claves técnicas como cabeceras aquí
      sCsvContent += aHeaders.map(sHeader => fnFormatCell(sHeader)).join(sDelimiter) + "\r\n";

      // 4. Añadir Filas de Datos
      aUsers.forEach(oUser => {
        const aRow = aHeaders.map(sKey => {
          let vValue = oUser[sKey];

          // Formateo específico para la fecha a YYYY-MM-DD
          if (sKey === 'birthDate') {
            // Si es un objeto Date válido
            if (vValue instanceof Date && !isNaN(vValue)) {
              vValue = vValue.getFullYear() + "-" +
                ("0" + (vValue.getMonth() + 1)).slice(-2) + "-" +
                ("0" + vValue.getDate()).slice(-2);
            }
            // Si es un string que parece fecha (YYYY-MM-DD), usarlo tal cual.
            // Si es null/undefined/otro, se convertirá a "" en fnFormatCell.
            else if (typeof vValue !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(vValue)) {
              // Si no es Date ni string YYYY-MM-DD, forzar a vacío
              vValue = null;
            }
          }
          // Para otros campos, simplemente usar el valor
          return fnFormatCell(vValue); // Formatear y escapar celda
        });
        sCsvContent += aRow.join(sDelimiter) + "\r\n";
      });

      // 5. Crear y Descargar Blob (protegido)
      try {
        const oBlob = new Blob([sCsvContent], { type: "text/csv;charset=utf-8;" });
        // Validar tamaño del Blob por si acaso
        if (oBlob.size === 1 && sCsvContent.length > 1) { // BOM solo tiene 1 byte UTF-8
          console.error("Error creando el Blob, tamaño inesperado.");
          throw new Error("Error creating Blob");
        } else if (oBlob.size === 1) { // Solo BOM, probablemente no hay datos
          console.warn("El contenido CSV parece vacío (solo BOM).");
        }

        const sUrl = URL.createObjectURL(oBlob);
        const oLink = document.createElement("a");
        oLink.href = sUrl;
        oLink.download = "users.csv";
        document.body.appendChild(oLink);
        oLink.click(); // Simular clic para descargar

        // Limpieza después de un pequeño delay para asegurar inicio de descarga
        setTimeout(() => {
          document.body.removeChild(oLink);
          URL.revokeObjectURL(sUrl);
          console.log("Recursos de descarga limpiados.");
        }, 100);

      } catch (e) {
        console.error("Error final al crear Blob o descargar CSV:", e);
        fnShowMessage("errorExportMsg", "Error exporting data");
      }
    } // Fin de onExportCsv
  }); // Fin de Controller.extend
}); // Fin de sap.ui.define