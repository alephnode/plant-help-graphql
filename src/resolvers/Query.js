const { getUserId } = require('../utils')

const plants = (root, args, context, info) => context.db.query.plants({}, info)
const users = (root, args, context, info) => {
  if (getUserId(context)) {
    return args.email
      ? context.db.query.users({ where: { email: args.email } }, info)
      : context.db.query.users({}, info)
  }
}
const images = (root, args, context, info) => context.db.query.images({}, info)
const categories = (root, args, context, info) =>
  context.db.query.categories({}, info)

module.exports = { plants, users, categories, images }
