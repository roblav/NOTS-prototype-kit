const { forEach } = require("lodash");

const titles = [
  'Mr',
  'Mrs',
  'Miss',
  'Dr',
  'Ms',
  'Professor',
  'Rev',
  'Lady',
  'Sir',
  'Captain',
  'Colonel',
  'Dame',
  'Lord',
  'Major',
];

function govInput(templatePlaceholder) {
  const inputObj = {
    id: templatePlaceholder.id,
    name: templatePlaceholder.name,
    label: {
      text: templatePlaceholder.title,
      classes: 'govuk-label govuk-label--s govuk-!-margin-bottom-2'
    },
    hint: {
      text: templatePlaceholder.description
    },
    attributes: {
      placeholder: templatePlaceholder.placeholder
    },
    errorMessage: {
      text: `Enter valid ${templatePlaceholder.title.toLowerCase()}`
    }
  };
  if (templatePlaceholder.type === 'freetext 100') {
    inputObj.hint = {
      text: `${templatePlaceholder.title} must be 100 characters or less`
    }
  }
  if (templatePlaceholder.type === 'personTitle') {
    inputObj.items = [
      {
        value: "",
        text: "Select"
      },
    ]
    titles.forEach( title => {
      inputObj.items.push(
        {
          value: title,
          text: title
        },
      )
    });
  }
  if (templatePlaceholder.type === 'currency') {
    inputObj.prefix = {
      text: "£"
    };
    inputObj.spellcheck = false;
  }
  return inputObj;
}

function groupTablePlaceholders(templatePlaceholders) {
  const groupTable = templatePlaceholders.filter(placeholder => {
    return placeholder.name.includes('array')
  })
  return groupTable;
}

function withoutGroupTablePlaceholders(templatePlaceholders) {
  const groupTable = templatePlaceholders.filter(placeholder => {
    return !placeholder.name.includes('array')
  })
  return groupTable;
}

function templateFormBuilder(templatePlaceholders) {
  // Loop over the array of placeholders
  const govInputArray = []
  const placeholders = withoutGroupTablePlaceholders(templatePlaceholders);
  placeholders.forEach(template => {
    govInputArray.push(govInput(template));
  });
  const govInputArrayGT = []
  const placeholdersGT = groupTablePlaceholders(templatePlaceholders);
  placeholdersGT.forEach(template => {
    govInputArrayGT.push(govInput(template));
  });
  const result = {
    placeholders: govInputArray,
    groupTable: govInputArrayGT
  };
  return result;
}

const templateTypeMap = {
  'email': 'govukInput',
  'personTitle': 'govukSelect',
  'string100Chars': 'govukInput',
  'freetext 100': 'govukInput',
  'date': 'govukInput',
  'Date': 'govukInput',
  'Text': 'govukInput',
  'currency': 'govukInput',
  'whole number': 'govukInput',
  'Free Text - Medium': 'govukInput',
  'Free Text - Long': 'govukInput',
  'Number with decimal': 'govukInput',
  'Telephone Number': 'govukInput',
};

function inputTypeBuilder(templatePlaceholders) {
  const govInputType = []
  const placeholders = withoutGroupTablePlaceholders(templatePlaceholders);
  placeholders.forEach(template => {
    govInputType.push(templateTypeMap[template.type]);
  });
  const govInputTypeGT = []
  const placeholdersGT = groupTablePlaceholders(templatePlaceholders);
  placeholdersGT.forEach(template => {
    govInputTypeGT.push(templateTypeMap[template.type]);
  });
  // return govInputType;
  const result = {
    placeholders: govInputType,
    groupTable: govInputTypeGT,
  };
  return result;
}

module.exports = {
  templateFormBuilder,
  inputTypeBuilder,
  groupTablePlaceholders,
  withoutGroupTablePlaceholders,
};
