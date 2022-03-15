// Function to handle user inputs to play the game
// @param i is current ball to make sure you play with the white ball
function userInputs(i) {
    // Key handler
    document.onkeydown = function (e) {
        if (e.keyCode === 67) {
            // C key
            controls.reset()
        }

        if (e.keyCode === 82) {
            // R key
            for (let k = 0; k < spheres.length; ++k) {
                p[k] = standPosition[k]
                v[k].x = 0
                v[k].y = 0
                Friction[k] = 0
            }
            tau[0] = 0
            counter = 0
            rowCounter = 0
        }

        if (e.keyCode === 39 && v.reduce((partialSum, a) => partialSum + a.length(), 0) == 0 && i == spheres.length - 1) {
            // right arrow
            tau[0] += angleChange
        } else if (e.keyCode === 37 && v.reduce((partialSum, a) => partialSum + a.length(), 0) == 0 && i == spheres.length - 1) {
            // left arrow
            tau[0] -= angleChange
        } else if (e.keyCode === 32 && v.reduce((partialSum, a) => partialSum + a.length(), 0) == 0 && i == spheres.length - 1) {
            // Space
            Force = Force_temp
            poolCue.visible = false
        } else if (e.keyCode === 38 && v.reduce((partialSum, a) => partialSum + a.length(), 0) == 0 && i == spheres.length - 1) {
            // Up arrow
            Force_temp += forceChange
            Force_temp = Math.min(Force_temp, maxPower)
            document.getElementById('powerbar').children[0].style.width = Force_temp / maxPower * 100 + '%'
        }
        else if (e.keyCode === 40 && v.reduce((partialSum, a) => partialSum + a.length(), 0) == 0 && i == spheres.length - 1) {
            // Down arrow
            Force_temp -= forceChange
            Force_temp = Math.max(Force_temp, minPower)
            document.getElementById('powerbar').children[0].style.width = Force_temp / maxPower * 100 + '%'
        }
    }
}