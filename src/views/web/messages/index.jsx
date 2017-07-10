import React, { Component } from 'react'
import classnames from 'classnames'
import moment from 'moment'

import BotAvatar from './bot_avatar'
import QuickReplies from './quick_replies'

import style from './style.scss'

class MessageGroup extends Component {
  render() {
    const sample = this.props.messages[0]
    const isBot = !sample.userId

    const passthroughProps = {
      avatar_url: null,
      foregroundColor: this.props.fgColor
    }

    const className = classnames(style.message, {
      [style.user]: !isBot
    })

    const bubbleColor = this.props.fgColor

    return <div className={className}>
      {isBot && <BotAvatar {...passthroughProps} />}
      <div className={style['message-container']}>
        {isBot && <div className={style['info-line']}>{sample.full_name}</div>}
        <div className={style.group}>
          {this.props.messages.map((data, i) => {
            return <Message bubbleColor={bubbleColor} key={`msg-${i}`} data={data} />
          })}
        </div>
      </div>
    </div>
  }
}

export default class MessageList extends Component {
  // Date Time
  // Group
  // Group
  // Date Time*
  // Group
  
  constructor(props) {
    super(props)

    this.messagesDiv = null
  }

  componentDidUpdate(prevProps, prevState) {
    this.tryScrollToBottom()
  }

  tryScrollToBottom() {
    try {
      this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight
    } catch (err) {
      // Discard the error
    }
  }

  renderQuickReplies() {
    const message = _.last(this.props.messages)
    const quick_replies = _.get(message, 'message_raw.quick_replies')

    return <QuickReplies 
      quick_replies={quick_replies}
      fgColor={this.props.fgColor}
      onQuickReplySend={this.props.onQuickReplySend} />
  }

  renderDate() {
    // TODO Implement this
    return null
  }

  renderMessageGroups() {
    const messages = this.props.messages || []
    const groups = []

    let lastSpeaker = null
    let lastDate = null
    let currentGroup = null

    messages.forEach(m => {
      const speaker = !!m.userId ? m.userId : 'bot'
      const date = m.sent_on

      // Create a new group if messages are separated by more than 5 minutes or if different speaker
      if (speaker !== lastSpeaker || moment(lastDate).diff(date, 'minutes') >= 5) {
        currentGroup = []
        groups.push(currentGroup)
      }

      currentGroup.push(m)

      lastSpeaker = speaker
      lastDate = date
    })

    if (this.props.typingUntil) {
      if (lastSpeaker !== 'bot') {
        currentGroup = []
        groups.push(currentGroup)
      }

      currentGroup.push({
        sent_on: new Date(),
        userId: null,
        message_type: 'typing'
      })
    }

    return <div>
      {groups.map((messages, i) => {
        return <MessageGroup 
          fgColor={this.props.fgColor}
          key={`msg-group-${i}`}
          messages={messages} />
      })}
    </div>
  }

  render() {
    return <div className={style.messages} ref={(m) => { this.messagesDiv = m }}>
      {this.renderDate()}
      {this.renderMessageGroups()}
      
      {this.renderQuickReplies()}
    </div>

    return <div>
      <span>
        {messages.map((m, k) => {
          return <Message config={this.props.config} data={m} key={k} />
        })} 
      </span>
    </div>
  }
}

class Message extends Component {

  render_text() {
    return <div><p>{this.props.data.message_text}</p></div>
  }

  render_quick_reply() {
    return <div><p>{this.props.data.message_text}</p></div>
  }

  render_typing() {
    const bubble = () => <div className={style.typingBubble} 
      style={{ backgroundColor: this.props.bubbleColor }}/>

    return <div className={style.typingGroup}>
      {bubble()}
      {bubble()}
      {bubble()}
    </div>
  }

  render_unsupported() {
    return <div><p>*Unsupported message type*</p></div>
  }

  render() {
    const bubbleStyle = !!this.props.data.userId
      ? { backgroundColor: this.props.bubbleColor }
      : null

    const renderer = (this['render_' + this.props.data.message_type] || this.render_unsupported).bind(this)

    return <div className={style.bubble} style={bubbleStyle}>
      {renderer()}
    </div>
  }
}
