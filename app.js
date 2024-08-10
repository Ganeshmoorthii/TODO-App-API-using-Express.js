const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()
const dbPath = path.join(__dirname, 'todoAppliation.db')
let db = null

app.use(express.json())

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    // Create the table if it doesn't exist
    await db.run(`
            CREATE TABLE IF NOT EXISTS todo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                todo TEXT NOT NULL,
                priority TEXT NOT NULL,
                status TEXT NOT NULL
            )
        `)

    app.listen(3000, () => {
      console.log('Server running on http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const hasPriorityAndStatusProperties = reqQuery => {
  return reqQuery.priority !== undefined && reqQuery.status !== undefined
}

const hasPriorityProperty = requestQuery => {
  return requestQuery.priority !== undefined
}

const hasStatusProperty = requestQuery => {
  return requestQuery.status !== undefined
}

const convertDbObjToJsonObj = item => {
  return {
    id: item.id,
    todo: item.todo,
    priority: item.priority,
    status: item.status,
  }
}

// API 1
app.get('/todos/', async (req, res) => {
  const {status, priority, search_q = ''} = req.query
  let getQuery = ''
  switch (true) {
    case hasPriorityAndStatusProperties(req.query):
      getQuery = `SELECT * FROM todo WHERE 
      todo LIKE '%${search_q}%' AND
      status LIKE '${status}' AND 
      priority LIKE '${priority}'`
      break
    case hasPriorityProperty(req.query):
      getQuery = `SELECT * FROM todo WHERE 
      todo LIKE '%${search_q}%' AND 
      priority LIKE '${priority}'`
      break
    case hasStatusProperty(req.query):
      getQuery = `SELECT * FROM todo WHERE 
      todo LIKE '%${search_q}%' AND 
      status LIKE '${status}'`
      break
    default:
      getQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`
  }
  const data = await db.all(getQuery) // Changed db.get to db.all for multiple rows
  res.send(data.map(item => convertDbObjToJsonObj(item))) // Removed map on a single object
})

// API 2
app.get('/todos/:todoId/', async (req, res) => {
  const {todoId} = req.params
  const getToDoQuery = `
  SELECT * FROM todo
  WHERE id = ${todoId}`
  const data = await db.get(getToDoQuery)
  res.send(convertDbObjToJsonObj(data))
})

// API 3
app.post('/todos/', async (req, res) => {
  const {id, todo, priority, status} = req.body
  const addQuery = `
  INSERT INTO todo (id, todo , priority, status)
  VALUES (
    ${id},'${todo}','${priority}','${status}'
  );
  `
  await db.run(addQuery)
  res.send('Todo Successfully Added')
})

// API 4
app.put('/todos/:todoId/', async (req, res) => {
  const {todoId} = req.params
  const {status, priority, todo} = req.body
  let updateColumn = ''
  let updateValue = ''

  if (status !== undefined) {
    updateColumn = 'status'
    updateValue = status
  } else if (priority !== undefined) {
    updateColumn = 'priority'
    updateValue = priority
  } else if (todo !== undefined) {
    updateColumn = 'todo'
    updateValue = todo
  }

  if (updateColumn !== '') {
    // Check if any valid column is to be updated
    const query = `UPDATE todo
      SET ${updateColumn} = '${updateValue}'
      WHERE id = ${todoId};
    `
    await db.run(query)
    res.send(
      `${updateColumn.charAt(0).toUpperCase() + updateColumn.slice(1)} Updated`,
    )
  } else {
    res.status(400).send('Invalid Update Request')
  }
})

// API 5
app.delete('/todos/:todoId/', async (req, res) => {
  const {todoId} = req.params
  const deleteQuery = `DELETE FROM todo 
  WHERE id = ${todoId}`
  await db.run(deleteQuery)
  res.send('Todo Deleted')
})

module.exports = app
