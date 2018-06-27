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

/**
 * updateUser will update all aspects of a user as a shallow copy,
 * so leaving fields out won't render them null. Also checks for
 * plant object passed before looking to associate. Limitation: doesnt
 * create new plant if doesn't exist.
 * TODO: turn into a foreach (to pass multiple plants at once)
 * TODO: connect vs create logic (to add plants that dont exist yet)
 */
function updateUser(root, args, context, info) {
  return args.plants
    ? context.db.mutation.updateUser(
        {
          data: {
            ...args,
            plants: {
              connect: [
                {
                  name: args.plants.name,
                },
              ],
            },
          },
          where: {
            email: args.email,
          },
        },
        info
      )
    : context.db.mutation.updateUser(
        {
          data: {
            ...args,
          },
          where: {
            email: args.email,
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
  updateUser,
}
