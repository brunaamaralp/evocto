import teamMembersHandler from '../lib/server/teamMembersHandler.js';

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  return teamMembersHandler(req, res);
}
