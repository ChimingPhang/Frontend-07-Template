function kmp(source, pattern) {
    // 计算table
    let table = new Array(pattern.length).fill(0);

    /*
    * a b c d a b c e
    * 0 0 0 0 0 1 2 3
    */
    {
        let i = 1, j = 0;
        while (i < pattern.length) {
            if (pattern[i] === pattern[j]) {
                ++i, ++j;
                table[i] = j;
            } else {
                if (j > 0) {
                    j = table[j];
                } else {
                    ++i;
                }
            }
        }

        console.log(table);
        
    }

    // 匹配
    // abcabde
    {
        let i = 0, j = 0;
        while (i < source.length) {
            if (source[i] === pattern[j]) {
                ++i, ++j;
                table[i] = j;
            } else {
                // 没匹配上，pattern位置就要回退到Table去了
                if (j > 0) {
                    j = table[j];
                } else {
                    ++i;
                }
            }
            
            if (j === pattern.length)
                return true;
        }
        return false;
    }
}

console.log(kmp('', 'abcdabce'));