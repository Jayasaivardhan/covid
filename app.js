const express = require('express')
let {open} = require('sqlite')
let sqlite3 = require('sqlite3')
let bcrypt = require('bcrypt')
let jwt = require('jsonwebtoken')
let path = require('path')

let dbpath = path.join(__dirname, 'covid19IndiaPortal.db')

let app = express()
let db = null
app.use(express.json())
InitializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log(
        'Server running by https://jayasaivardhandttqpnjscpikngv.drops.nxtwave.tech',
      )
    })
  } catch (e) {
    console.log(e.message)
    process.exit(1)
  }
}
InitializeDBandServer()

const converseObject = dbobj => {
  return {
    stateId: dbobj.state_id,
    stateName: dbobj.state_name,
    population: dbobj.population,
  }
}
const converseObject2 = dbobj2 => {
  return {
    districtId: dbobj2.district_id,
    districtName: dbobj2.district_name,
    stateId: dbobj2.state_id,
    cases: dbobj2.cases,
    cured: dbobj2.cured,
    active: dbobj2.active,
    deaths: dbobj2.deaths,
  }
}

function authorizationCheck(request, response, next) {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'jessy', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

app.post('/login/', async (request, response) => {
  let {username, password} = request.body
  let query = `select * from user where username = '${username}';`
  let res = await db.get(query)
  if (res === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    let checkPass = await bcrypt.compare(password, res.password)
    if (checkPass === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'jessy')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

app.get('/states/', authorizationCheck, async (request, response) => {
  let query1 = `
    SELECT
      *
    FROM
      State ;`

  const players = await db.all(query1)
  response.send(players.map(dbobj => converseObject(dbobj)))
})

app.post('/districts/', authorizationCheck, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const aQuery = `
    INSERT INTO
      District (district_name,state_id,cases,cured,active,deaths)
    VALUES
      (
       '${districtName}',
         ${stateId},
        '${cases}',
        '${cured}',
         '${active}',
         '${deaths}'
      );`

  const dbResponse = await db.run(aQuery)
  response.send('District Successfully Added')
})

app.get('/states/:stateId/', authorizationCheck, async (request, response) => {
  let {stateId} = request.params
  let iquery = `select
                *
                from
               State
               where state_id = ${stateId}; `

  const resy = await db.get(iquery)
  response.send(converseObject(resy))
})

app.get(
  '/districts/:districtId/',
  authorizationCheck,
  async (request, response) => {
    const {districtId} = request.params
    const que = `select
              * 
             from
            District where district_id = ${districtId};
            `
    const res = await db.get(que)
    response.send(converseObject2(res))
  },
)

app.put(
  '/districts/:districtId/',
  authorizationCheck,
  async (request, response) => {
    let {districtId} = request.params
    let {districtName, stateId, cases, cured, active, deaths} = request.body
    const updateplayerQuery = `
    UPDATE
      District
    SET
      district_name='${districtName}',
      state_Id=${stateId},
      cases = ${cases},
      cured= ${cured},
      active= ${active},
      deaths= '${deaths}'
    WHERE
      district_id = ${districtId} ;`
    let playerresponse = await db.run(updateplayerQuery)
    response.send('District Details Updated')
  },
)

app.delete(
  '/districts/:districtId/',
  authorizationCheck,
  async (request, response) => {
    let {districtId} = request.params
    const deleteplayerQuery = `
    DELETE FROM
      District
    WHERE
      district_id = ${districtId};`
    let playerResponse = await db.run(deleteplayerQuery)
    response.send('District Removed')
  },
)

app.get(
  '/states/:stateId/stats/',
  authorizationCheck,
  async (request, response) => {
    let {stateId} = request.params
    let query = `
  select 
  sum(cases) as totalCases,
  sum(cured) as totalCured,
  sum(active) as totalActive,
  sum(deaths) as totalDeaths
  from District where state_id=${stateId};
  `
    let res = await db.get(query)
    response.send(res)
  },
)

app.get('/districts/:districtId/details/', async (request, response) => {
  let {districtId} = request.params
  let query = `
  select state_name as stateName from State where state_id = (select state_id from District where district_id=${districtId});
  `
  let res = await db.get(query)
  response.send(res)
})

module.exports = app
