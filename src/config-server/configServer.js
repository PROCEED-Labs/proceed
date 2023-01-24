const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());

const PORT = 33030;
// TODO: URL is probable wrong, because it is always "localhost". Set the correct one
const URL = `http://localhost:${PORT}`;

let providers = [
  {
    clientid: 'client1',
    clientsecret: '27d4e246-0563-4e6c-8325-27bc6e596139',
    provider: 'http://localhost:8082/auth/realms/master/protocol/openid-connect/token',
    ldapip: 'localhost',
    ldapport: 10389,
    ldapdn: 'dc=example,dc=org',
  },
];

/* REST */
app.get('/provider', (req, res) => {
  res.send(providers);
});

app.get('/provider/:dn', (req, res) => {
  res.json(providers.filter((p) => p.ldapdn === req.params.dn)[0]);
});

app.delete('/provider/:clientid', (req, res) => {
  providers = providers.filter((p) => p.clientid !== req.params.clientid);
  res.send('Provider deleted');
});

app.post('/provider/', (req, res) => {
  if (Object.keys(req.body).length === 4) {
    providers.push(req.body);
    res.send('Provider added');
  } else {
    res.status(400).send('Provider Data not all given. Error');
  }
});

/*
HTML, better Vue App
 */
app.get('/', (req, res) => {
  let output =
    "<h2>Current Providers <div style='background-color:grey; display:inline'><a href='new'><span style='font-size:16px; color:white'>NEW PROVIDER</span></a></div></h2>";
  providers.forEach((p) => {
    output += `<div style="border:1px solid black; padding:2em"><p style="color:red"><a href="/provider/delete/${p.clientid}">[DELETE PROVIDER]</a></p><p>ClientID: ${p.clientid}</p><p>ClientSecret: ${p.clientsecret}</p><p>provider: ${p.provider}<p>LDAP IP: ${p.ldapip}</p><p>LDAP PORT: ${p.ldapport}</p><p>LDAP DN: ${p.ldapdn}</p></div>`;
  });
  output += '</ul>';
  res.send(output);
});

app.get('/provider/delete/:clientid', (req, res) => {
  const url = `${URL}/provider/${req.params.clientid}`;
  request.delete(url);
  res.send(`Provider with clientID: ${req.params.clientid} deleted. <a href='${URL}'>Go back</a>.`);
});

app.get('/new', (req, res) => {
  let output = `<form method='post' action='${URL}/provider'>`;
  output += "ClientID: <input type='text' name='clientid'><br />";
  output += "ClientSecret: <input type='text' name='clientid'><br />";
  output += "OpenID Connect Provider Token Endpoint: <input type='text' name='clientid'><br />";
  output += "LDAP IP: <input type='text' name='ldapip'><br />";
  output += "LDAP Port: <input type='text' name='ldapport'><br />";
  output += "LDAP DN: <input type='text' name='ldapdn'><br />";
  output += "<input type='submit' value='Save' /></form>";
  res.send(output);
});

app.listen(PORT, () => {
  // TODO: Output the listened Host and Port
  console.log(`Example app listening on ${URL}`);
});
