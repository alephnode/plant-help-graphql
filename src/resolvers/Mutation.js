const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const fetch = require('node-fetch')

async function signup(root, args, context, info) {
  const password = await bcrypt.hash(args.password, 10)
  const user = await context.db.mutation.createUser(
    {
      data: { ...args, password },
    },
    `{ id email }`
  )

  const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)

  return {
    token,
    user,
  }
}

async function login(root, args, context, info) {
  const user = await context.db.query.user(
    { where: { email: args.email } },
    ` { id email password } `
  )
  if (!user) {
    throw new Error('No such user found')
  }

  const valid = await bcrypt.compare(args.password, user.password)
  if (!valid) {
    throw new Error('Invalid password')
  }

  const token = await jwt.sign({ userId: user.id }, process.env.APP_SECRET)

  return {
    token,
    user,
  }
}

function subscribe(root, args, context, info) {
  let { email } = args
  return fetch(process.env.SENDGRID_RECIPIENT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
    },
    body: JSON.stringify([{ email }]),
  })
    .then(r => r.json())
    .then(
      re =>
        re.persisted_recipients.length
          ? fetch(
              `https://api.sendgrid.com/v3/contactdb/lists/5023215/recipients/${
                re.persisted_recipients[0]
              }`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
                },
              }
            ).then(() => 'Account added to list.')
          : Error(`Error - Sendgrid Output: ${re.errors[0].message}`)
    )
}

function createPlant(root, args, context, info) {
  let details = ({ name, description, frequency, exposure } = args)
  return context.db.mutation.createPlant(
    {
      data: {
        ...details,
        categories: args.categories
          ? {
              connect: {
                name: args.categories.name,
              },
            }
          : null,
        images: args.images
          ? {
              connect: {
                id: args.images.id,
              },
            }
          : null,
      },
    },
    info
  )
}

function deletePlant(root, args, context, info) {
  return context.db.mutation.deletePlant({ where: { name: args.name } }, info)
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

function removeUserPlant(root, args, context, info) {
  return context.db.mutation.updateUser(
    {
      data: {
        plants: { disconnect: [{ name: args.plantName }] },
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
  subscribe,
  createPlant,
  deletePlant,
  addCategory,
  updateUser,
  removeUserPlant,
}
