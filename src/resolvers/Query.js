const plants = (root, args, context, info) => context.db.query.plants({}, info)
const users = (root, args, context, info) => context.db.query.users({}, info)
const categories = (root, args, context, info) =>
  context.db.query.categories({}, info)

module.exports = { plants, users, categories }
