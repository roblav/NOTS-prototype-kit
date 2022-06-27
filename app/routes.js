const express = require("express");
const router = express.Router();

const {
  templateFormBuilder,
  inputTypeBuilder
} = require('./utils/template-form-buillder.js');

const { 
  optInPlaceholders,
  optInEmailTemplate 
} = require('./utils/mockData');

// Add your routes here - above the module.exports line

router.get("/email-templates/accessible-form-table", function (req, res) {
  const templateFileName = 'IPC147';
  const templateData = require(`./utils/mockData/${templateFileName}.json`);
  const templateName = templateData.templateName;
  // Use placeholders that are not group table values
  const inputTypes = inputTypeBuilder(templateData.placeholders);
  const optInEmailInputs = templateFormBuilder(templateData.placeholders);

  // { govInputArray, groupTablePlaceholders }
  res.render("email-templates/accessible-form-table", { 
    templateName,
    inputTypes,
    optInEmailInputs: optInEmailInputs.placeholders,
    groupTablePlaceholders: optInEmailInputs.groupTable
  });
});

router.get("/email-templates/group-table", function (req, res) {
  const templateFileName = 'IPC147';
  const templateData = require(`./utils/mockData/${templateFileName}.json`);
  const templateName = templateData.templateName;
  // Use placeholders that are not group table values
  const inputTypes = inputTypeBuilder(templateData.placeholders);
  const optInEmailInputs = templateFormBuilder(templateData.placeholders);

  // { govInputArray, groupTablePlaceholders }
  res.render("email-templates/group-table", { 
    templateName,
    inputTypes,
    optInEmailInputs: optInEmailInputs.placeholders,
    groupTablePlaceholders: optInEmailInputs.groupTable
  });
});

router.get("/email-templates/:template", function (req, res) {
  const templateFileName = req.params.template;
  const showErrors = req.query.errors;
  const templateData = require(`./utils/mockData/${templateFileName}.json`);
  const templateName = templateData.templateName;
  const inputTypes = inputTypeBuilder(templateData.placeholders);
  const optInEmailInputs = templateFormBuilder(templateData.placeholders);

  console.log('>>>', optInEmailInputs.groupTable.length);
  res.render("email-templates/template", { 
    templateName,
    inputTypes,
    optInEmailInputs: optInEmailInputs.placeholders,
    groupTablePlaceholders: optInEmailInputs.groupTable,
    showErrors 
  });
});

module.exports = router;
