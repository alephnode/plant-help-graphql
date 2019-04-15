const plants = (_, args, context, info) => context.db.query.plants({}, info)
const users = (_, args, context, info) =>
  args.email
    ? context.db.query.users({ where: { email: args.email } }, info)
    : context.db.query.users({}, info)

const images = (_, args, context, info) => context.db.query.images({}, info)
const categories = (_, args, context, info) =>
  context.db.query.categories({}, info)

module.exports = { plants, users, categories, images }
