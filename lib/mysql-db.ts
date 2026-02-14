// lib/mysql-db.ts
import mysql from 'mysql2/promise'

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3309'), // Changed to 3309
  database: process.env.DB_NAME || 'habesha_bingo',
  user: process.env.DB_USER || 'smegn', // Changed to smegn
  password: process.env.DB_PASSWORD || '123456@Sm', // Your password
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  decimalNumbers: true,
  timezone: '+00:00', // Use UTC timezone
  charset: 'utf8mb4',
}

console.log('Database configuration:', {
  ...dbConfig,
  password: dbConfig.password ? '***SET***' : '***NOT SET***',
})

// Create connection pool
let pool: mysql.Pool

try {
  pool = mysql.createPool(dbConfig)
  console.log('Database pool created successfully on port', dbConfig.port)
} catch (error: any) {
  console.error('Failed to create database pool:', error.message)
  throw error
}

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection()
    const [result] = await connection.query('SELECT 1 + 1 as test, NOW() as time, DATABASE() as db, USER() as user')
    console.log('Database connection test: SUCCESS', result)
    connection.release()
  } catch (error: any) {
    console.error('Database connection test: FAILED', error.message)
  }
}

// Run test
testConnection()

// Database utility functions
export const db = {
  query: async (sql: string, params: any[] = []): Promise<any> => {
    const connection = await pool.getConnection()
    try {
      console.log('SQL:', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''))
      console.log('Params:', params)
      
      const [rows] = await connection.execute(sql, params)
      return rows
    } catch (error: any) {
      console.error('Query error:', {
        message: error.message,
        code: error.code,
        sql: sql,
        params: params,
      })
      throw error
    } finally {
      connection.release()
    }
  },

  execute: async (sql: string, params: any[] = []): Promise<any> => {
    return db.query(sql, params)
  },

 transaction: async (callback: (connection: any) => Promise<any>) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const result = await callback({
      execute: async (sql: string, params: any[]) => {
        const [result] = await connection.execute(sql, params)
        return result
      },
      query: async (sql: string, params: any[]) => {
        const [rows] = await connection.execute(sql, params)
        return rows
      },
    })

    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
,
}

export default pool