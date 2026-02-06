import { GameHome } from "@/components/game/game-home"
import { Header } from "@/components/layout/header"
import { BottomNav } from "@/components/layout/bottom-nav"


export default function HomePage() {
    return (
        <>
            <Header />
            <GameHome />
            <BottomNav />
        </>
    )
    
}