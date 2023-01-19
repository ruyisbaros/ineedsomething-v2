
const generator = (length: number): number => {
    const nums = "0123456789"
    let result = ""
    const charLength = nums.length

    for (let i = 0; i < length; i++) {
        result += nums.charAt(Math.floor(Math.random() * charLength))
    }
    return parseInt(result, 10)
}

export default generator