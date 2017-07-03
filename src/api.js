import _ from 'lodash'

import injectScript from 'raw!./inject.js'
import injectStyle from 'raw!./inject.css'

import db from './db'
import users from './users'

const ERR_USER_ID_REQ = "`userId` is required and must be valid"
const ERR_MSG_TYPE = "`type` is required and must be valid"

/*
  Supported message types:

  *** type: text ***
      text: "string", up to 360 chars
      raw: null
      data: null

  *** type: file ***
      text: "text associated with the file", up to 360 chars
      raw: {
        file_name: "lol.png"
        file_mime: "image/png"
      }
      data: BINARY_DATA // max size = 10 Mb

 */

module.exports = async (bp, config) => {

  const knex = await bp.db.get()

  const { listConversations, appendUserMessage, getOrCreateRecentConversation } = db(knex, bp.botfile)
  const { getOrCreateUser } = await users(bp, config)

  const router = bp.getRouter('botpress-web', { auth: false })
    
  router.get('/inject.js', (req, res) => {
    res.contentType('text/javascript')
    res.send(injectScript)
  })

  router.get('/inject.css', (req, res) => {
    res.contentType('text/css')
    res.send(injectStyle)
  })

  // ?conversationId=xxx (optional)
  router.post('/message/:userId', async (req, res) => {
    const { userId } = req.params || {}

    if (!validateUserId(userId)) {
      res.status(400).send(ERR_USER_ID_REQ)
    }

    await getOrCreateUser(userId) // Just to create the user if it doesn't exist

    const payload = (req.body || {})
    let { conversationId } = (req.query || {})

    if (!_.includes(['text'], type)) { // TODO: Support files
      res.status(400).send(ERR_MSG_TYPE)
    }

    if (!conversationId) {
      conversationId = await getOrCreateRecentConversation(userId)
    }

    await sendNewMessage(userId, conversationId, payload)

    return res.sendStatus(200)
  })

  router.get('/conversations/:userId', async (req, res) => {
    const { userId } = req.params || {}

    if (!validateUserId(userId)) {
      res.status(400).send(ERR_USER_ID_REQ)
    }

    await getOrCreateUser(userId) // Just to create the user if it doesn't exist

    const conversations = await listConversations(userId)

    return res.send([...conversations])
  })

  function validateUserId(userId) {
    return /(a-z0-9-_)/i.test(userId)
  }

  async function sendNewMessage(userId, conversationId, payload) {

    if (payload.text && (!_.isString(payload.text) || payload.text.length > 360)) {
      throw new Error('Text must be a valid string of less than 360 chars')
    }

    const sanitizedPayload = _.pick(payload, ['text', 'type'])

    await appendUserMessage(userId, conversationId, sanitizedPayload)

    const user = await getOrCreateUser(userId)

    return bp.middlewares.sendIncoming({
      platform: 'web',
      type: payload.type,
      user: user,
      text: payload.text,
      raw: payload
    })
  }

  async function sendEvent(userId, event, data) {

  }
}

