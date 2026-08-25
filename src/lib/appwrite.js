import { Client, Account, Databases } from 'appwrite';

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('6a7f84d80020372c33db');

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };
