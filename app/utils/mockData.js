const optInPlaceholders = [
    {
      id: '1',
      name: 'custEmail',
      type: 'email',
      description: 'Email Address',
    },
    {
      id: '2',
      name: 'custTitle',
      type: 'personTitle',
      description: 'Title',
    },
    {
      id: '3',
      name: 'custFirstName',
      type: 'string30Chars',
      description: 'First Name',
    },
    {
      id: '4',
      name: 'custSurname',
      type: 'string30Chars',
      description: 'Last Name',
    },
    {
      id: '5',
      name: 'orgAgentName',
      type: 'string30Chars',
      description: 'Agent Name',
    },
  ];

  const optInEmailTemplate = {
    "templateId": "EMDOTID00011",
    "templateName": "OPT-IN EMAIL CONFIRMATION",
    "templateDescription": "OPT-IN EMAIL CONFIRMATION",
    "language": ["en"],
    "templateVersion": 3,
    "isAvailable": true,
    "channels": [
      {
        "channel": "email",
        "policyOverride": "false"
      }
    ],
    "placeholders": [
      {
        "id": "1",
        "name": "custEmail",
        "type": "email",
        "description": "Email Address"
      },
      {
        "id": "2",
        "name": "custTitle",
        "type": "personTitle",
        "description": "Title"
      },
      {
        "id": "3",
        "name": "custFirstName",
        "type": "string30Chars",
        "description": "First Name"
      },
      {
        "id": "4",
        "name": "custSurname",
        "type": "string30Chars",
        "description": "Last Name"
      },
      {
        "id": "5",
        "name": "orgAgentName",
        "type": "string30Chars",
        "description": "Agent Name"
      }
    ],
    "organisations": [
      {
        "id": "OTOUID00001",
        "organisationName": "International Group",
        "emailReplyTo": "reply-to-IG@dwp.gov.uk"
      }
    ]
  }

  module.exports = {
    optInPlaceholders,
    optInEmailTemplate,
  };