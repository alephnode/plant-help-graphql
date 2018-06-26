const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { getUserId } = require('../utils')

async function signup(parent, args, context, info) {
  const password = await bcrypt.hash(args.password, 10)
  const user = await context.db.mutation.createUser(
    {
      data: { ...args, password },
    },
    `{ id }`
  )

  const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)

  return {
    token,
    user,
  }
}

async function login(parent, args, context, info) {
  const user = await context.db.query.user(
    { where: { email: args.email } },
    ` { id password } `
  )
  if (!user) {
    throw new Error('No such user found')
  }

  const valid = await bcrypt.compare(args.password, user.password)
  if (!valid) {
    throw new Error('Invalid password')
  }

  const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)

  return {
    token,
    user,
  }
}

function addPlant(root, args, context, info) {
  return context.db.mutation.createPlant(
    {
      data: {
        name: args.name,
        description: args.description,
        frequency: args.frequency,
        exposure: args.exposure,
        categories: args.categoryName
          ? {
              connect: {
                name: args.categoryName,
              },
            }
          : null,
      },
    },
    info
  )
}

function addCategory(root, args, context, info) {
  return context.db.mutation.createCategory(
    {
      data: {
        name: args.name,
        description: args.description,
      },
    },
    info
  )
}

module.exports = {
  signup,
  login,
  addPlant,
  addCategory,
}
