### Descriptive Statistics
啥都没说

### Regression Analysis
AI学过

### Correlation Analysis
你都懂的

### Factor Analysis
- principle component analysis(pca)
    - 一种线性降维方法，以减少变量个数。希望在所投影的维度上方差最大，以此使用较少的数据维度，来保留住较多的元数据特征。（找到最重要的变量）
    - 经常的做法是：
        - seek a linear combination of  the original indicator, $F_i$:<br>$F_1=a_{11}X_1+a_{21}X_2+...+a_{p1}X_p$<br>$F_2=a_{12}X_1+...+a_{p2}X_p$<br>...<br>Subject to:
            - The sum of all coefficients for a factor equals to 1<br>$a_{1i}^2+a_{2i}^2+...+a_{pi}^2=1$
            - The factors are independent
            - The variance of the factors is successively decreasing:<br>$Var(F_1)\ge Var(F_2)\ge ...\ge Var(F_p)$
    - 例子：两个变量的情况
        - 找到平均值以及Covariance matrix S;
        - Find the characteristic root of S
        - Find the corresponding characteristic vectors
        - Find the final PCA expression:<br>$F_1=a_{11}(x_1-\bar{x_1})+a_{21}(x_2-\bar{x_2})$<br>$F_2=a_{12}(x_1-\bar{x_1})+a_{22}(x_2-\bar{x_2})$


### Orthogonal Experimental Design


### Clustering & Classification


### Hypothesis Testing