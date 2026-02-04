import { AdminApiService } from "../api/admin.api"
import { User, Game } from "../types"

export class AdminService {
  private allUsers: User[] = []
  private completedGames: Game[] = []

  async fetchAdminData(): Promise<void> {
    const [users, games] = await Promise.all([
      AdminApiService.fetchUsers(),
      AdminApiService.fetchCompletedGames(),
    ])

    this.allUsers = users
    this.completedGames = games
  }

  // Getters
  getAllUsers(): User[] {
    return this.allUsers
  }

  getCompletedGames(): Game[] {
    return this.completedGames
  }
}