import React from 'react'

const PollPage = async ({ params }: { params: { publicKey: string } }) => {
    const { publicKey } = await params
  return (
    <div> PollPage {publicKey}</div>
  )
}


export default PollPage