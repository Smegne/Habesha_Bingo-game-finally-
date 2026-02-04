import { API_URL } from "../constants/api.constants"

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export const setAuthToken = (token: string): void => {
  if (typeof window === "undefined") return
  localStorage.setItem("token", token)
}

export const clearAuthToken = (): void => {
  if (typeof window === "undefined") return
  localStorage.removeItem("token")
}

export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken()
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  }
}

export const handleApiError = async (response: Response): Promise<{ error: string }> => {
  try {
    const errorData = await response.json()
    return { error: errorData.error || `HTTP error ${response.status}` }
  } catch {
    return { error: `HTTP error ${response.status}` }
  }
}

export const parseCardNumbers = (numbers: any): number[][] => {
  if (Array.isArray(numbers)) return numbers
  if (typeof numbers === "string") {
    try {
      return JSON.parse(numbers || "[]")
    } catch {
      return []
    }
  }
  return []
}