import mysql from 'mysql2/promise'

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'habesha_bingo',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Utility functions for MySQL
export const db = {
  query: async (sql: string, params: any[] = []) => {
    const [rows] = await pool.execute(sql, params)
    return rows
  },

  transaction: async (callback: (connection: any) => Promise<any>) => {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const result = await callback(connection)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  },
}

export default pool