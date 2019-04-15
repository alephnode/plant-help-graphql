const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const fetch = require('node-fetch')

const signup = async (_, args, context, info) => {
  let password, fbUserId
  let socialAuth = args.fbUserId ? args.fbUserId : false
  if (!socialAuth && !args.password) {
    throw new Error('Invalid credentials passed')
  }
  if (!socialAuth) {
    password = await bcrypt.hash(args.password, 10)
  } else {
    fbUserId = await bcrypt.hash(args.fbUserId, 10)
  }
  const data = socialAuth ? { ...args, fbUserId } : { ...args, password }
  const user = await context.db.mutation.createUser(
    {
      data,
    },
    `{ id email }`
  )

  const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)

  return {
    token,
    user,
  }
}

const login = async (root, args, context) => {
  let socialAuth = args.fbUserId
  const user = await context.db.query.user(
    { where: { email: args.email } },
    ` { id email password fbUserId } `
  )
  if (!user) {
    if (socialAuth) {
      return signup(root, args, context)
    } else {
      throw new Error('No such user found')
    }
  }

  const valid = await bcrypt.compare(
    socialAuth ? args.fbUserId : args.password,
    socialAuth ? user.fbUserId : user.password
  )
  if (!valid) {
    throw new Error('Invalid password')
  }

  const token = await jwt.sign({ userId: user.id }, process.env.APP_SECRET)

  return {
    token,
    user,
  }
}

const subscribe = (_, args) => {
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
    .then(re =>
      re.persisted_recipients.length
        ? fetch(
            `${process.env.SENDGRID_CAMPAIGN_ENDPOINT}/${
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

const createPlant = (_, args, context, info) => {
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

const deletePlant = (_, args, context, info) =>
  context.db.mutation.deletePlant({ where: { name: args.name } }, info)

const addCategory = (_, args, context, info) =>
  context.db.mutation.createCategory(
    {
      data: {
        name: args.name,
        description: args.description,
      },
    },
    info
  )

/**
 * updateUser will update all aspects of a user as a shallow copy,
 * so leaving fields out won't render them null. Also checks for
 * plant object passed before looking to associate. Limitation: doesnt
 * create new plant if doesn't exist.
 * TODO: turn into a foreach (to pass multiple plants at once)
 * TODO: connect vs create logic (to add plants that dont exist yet)
 */
const updateUser = (_, args, context, info) =>
  args.plants
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

const removeUserPlant = (_, args, context, info) =>
  context.db.mutation.updateUser(
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
