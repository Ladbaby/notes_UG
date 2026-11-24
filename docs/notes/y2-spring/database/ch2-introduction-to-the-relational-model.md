## 2.1 Structure of Relational Databases
显然这是由==表格==表达的关系

这个模型和数学概念里的*relation*有着很大的联系：
- **relation**

    表格自己
- **tuple**

    表格的一行
- **attribute**

    表格的一列

    - **domain**

        *attribute*可能的值的范围
        - **atomic**

            假如*domain*里面的元素==不可拆分==，就是*atomic*

            eg. 假设一个人有好多手机号码，那么对于*phone_number*这么一个*attribute*来说，假设我们需要的参数是单个手机号码，则这个性质就不是*atomic*的，因为值域是手机号码的==集合==，这个集合可以被拆分为许多的手机号码。

            是否*atomic*还取决于使用者需要什么，比如我想知道的是一个手机号码的城区编号，那么单个手机号码此时也变成非*atomic*了

## 2.2 Database Schema
把*relation*的概念和编程语言的*变量*类比的话：
$$
relation\iff variable \\
relation\ schema\iff variable\ type\\
relation\ instance\iff variable\ value
$$
<img src="./image/2022-02-27%20112309.png" width=80%>

上图对应的*relation schema*是：
$$
department(dept\_name, building, budget)
$$
## 2.3 Keys
关于*superkey, candidate key, primary key*的解释见6.5

- **Foreign Key**

    the value of *A* for each tuple in $r_1$ must also be the value of *B* for some tuple in $r_2$

    Attribute set *A* is called a **foreign key** from $r_1$. 
    
    The relation $r_1$ is also called the ==referencing== relation of the foreign-key
    constraint, and $r_2$ is called the ==referenced== relation.（需要注意的是*B*==必须要是primary key==）

    > eg. 假如第一个关系$r_1$是*instructor* relation，*A*是*dept_name*; $r_2$是*department* relation，*B*同样是*dept_name*。那么按理来说，$r_1$里的任意一个*dept_name*都必须要在$r_2$里能找得到（不然老师就报了假的家庭住址）

## 2.6 The Relational Algebra
### 2.6.1 The Select Operation
$\sigma$代表*选择*
$$
\sigma_{dept\_name=``\text{Physics}"}{(instructor)}
$$
这是选择*instructor*关系里*dept_name="Physics"* 的row

关系可以是各种不等号，选择条件也可以用not, and, or复合：
$$
\sigma_{dept\_name=``\text{Physics}"\land salary>90000}(instructor)
$$
这是选择*instructor*关系里*dept_name="Physics"* 且 *salary>90000* 的row

### 2.6.2 The Project Operation
假如我们只关心一个表格的一部分性质，我们可以通过*project* operation来实现

$\Pi$代表*project*操作:
$$
\Pi_{ID,name,salary}(instructor)
$$
这样子就是仅仅保留原本表格中的*ID,name,salary*三个attribute

其实*project*操作可以变得更加自由，新的表格的属性只要是原本表格的性质的==表达式==都可以:
$$
\Pi_{ID,name,salary/12}(instructor)
$$

> 顺带一提，*project*有==删除重复行==的作用

### 2.6.3 Composition of Relational Operations
鉴于relational operation的结果也是一个*relation*，我们可以进行数学运算一样的==复合==操作：
$$
\Pi_{name}(\sigma_{dept\_name=``\text{Physics}"}(instructor))
$$
"Find the names of all instructors in the Physics department"

### 2.6.4 The Cartesian-Product Operation
[kɑrˈtiʒən]笛卡尔

<img src="./image/2022-02-28%20151153.png" width=100%>

仔细观察表格变化，感觉有一种矩阵相乘的感觉

有时候，两个表的部分属性名字会一样，我们可以先在前面加上relation的名字作为前缀。据说Rename可以解决
### 2.6.5 The Join Operation
其实就是*Cartesian* 和*select* operation相结合，可以去除掉我们不关心或者没意义的row

$\Join$代表*join* operation:
$$
\sigma_{instructor.ID=teaches.ID}(instructor\times teaches)\\
~\\
\Rightarrow instructor\Join_{instructor.ID=teaches.ID}teaches
$$

#### 4.1.3 Outer Joins
实际上之前接触的*Join*一般称为*inner Join*

*left outer join*的例子：

> *student*和*takes*两个*relation*进行*inner join*，来统计每个学生参加了哪些课程的话，结果可能会不符合预期。因为假设有学生啥课程都没有参加，那么结果里面就不会包含这个家伙的信息。*left outer join*可以解决这个问题，在结果中保留这个家伙的信息，而在课程那一栏写*null*

- **left outer join**

    保留左边的*entity set*的属性
- **right outer join**
- **full outer join**

    两边都保留

### 2.6.6 Set Operations
想要做集合运算，两个集合必须满足一些条件：
- 两个关系有==相同数量==的*attribute*
- 对应位置的*attribute*要是==相同类型==的
> 搞了半天不就是属性完全一样吗

符合要求的称为**union-compatible**

- **Union**

    $\cup$

    非常单纯的把所有row合并起来
- **Intersection**

    $\cap$

    单纯取交集
- **Set-difference**

    假如row在第二个集合中出现, 则在第一个集合中删除该row

    <img src="./image/2022-02-28%20191118.png" width=100%>
- **Division**

    <img src="./image/2022-02-28%20191510.png" width=100%>

    大概意思是，A/B满足以下特征
    - 不包含B中的attribute
    - 将B中的row和A/B中的row进行排列组合的合并，每一种组合都必定存在于A中(比如图中，$(s1,p2),(s1,p4),(s4,p2),(s4,p4)$)
### 2.6.8 The Rename Operation
说了半天，其实就是把两个relation中名字重复的attribute重新命名一下

用$\rho$表示

比如我想把employee重命名成employee2，那么就写成：
$$
\rho(\text{employee2,employee})
$$

