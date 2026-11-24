## 4.1 Join Expressions
### 4.1.1 Natural Join
单论意思很简单，就是这段话
```sql{.line-numbers}
select name, course_id
from student, takes
where student.ID = takes.ID;
```
等价于:
```sql{.line-numbers}
select name, course_id
from student natural join takes;
```
## 4.2 Views
### 4.2.1 `view` Definition
很多时候，使用数据库的人并不需要接触到所有的数据，我们就可以通过创建`view`来达成这种权限限制:
```sql{.line-numbers}
create view faculty as
    select ID, name, dept_name
    from instructor;
```
感觉就像创建出来了一个新的*relation*，是但实际上并不是，SQL只会在每次需要access里面的值的时候现场计算出来，并==没有真的存储起来==

听起来似乎和`with`语句很像，区别在于`with`的作用域是局部的，而`view`可以全局存在
### 4.2.2 Using `view` in SQL Queries
反正*relation*能使用的地方`view`都可以被使用，甚至可以用`view`来定义另一个`view`
```sql{.line-numbers}
create view departments_total_salary(dept_name, total_salary) as
    select dept_name, sum(salary)
    from instructor
    group by dept_name;
```
可以看到原本`sum(salary)`是没有对应的名字的，声明的时候声明成了`total_salary`

想要删除`view`的话，使用`drop view`

## 4.4 Integrity Constraints
### 4.4.5 Referential Integrity
`foreign key`可以被声明为`create table`的一部分:
```sql{.line-numbers}
create table course
    (course_id varchar(8),
    title varchar(50),
    dept_name varchar(20),
    credits numeric(2,0) check (credits > 0),
    primary key (course_id),
    foreign key(dept_name) references department);
```
至于被引用的键，则必须是个*superkey*，用`primary key`或者`unique`来声明:
```sql{.line-numbers}
create table Enrolled
    (sid char(20),
    cid char(20),
    grade char(2),
    primary key (sid),
    unique (cid,grade));
```
这种指来指去的约束链看着似乎挺正常，但是一旦要删除或更新其中一项的时候:
```sql{.line-numbers}
create table course
    (...
    foreign key (dept_name) references department
        on delete cascade
        on update cascade,
    ...);
```
正常情况下，假如`department`那边删除或更新违反了这种constraint，SQL是会拒绝这种删除或更新请求的。然而声明了`on delete cascade`和`on update cascade`之后，删除和更新都会被允许及同步。也就是说，那些包含了对应*foreign key*的tuple都会被同步删除、更新
### 4.4.8 Complex Check Conditions and Assertions
`assert`是一种你希望数据库一直满足的条件

比如: "Ensuring the sum of loan amounts for each branch is less than the sum of all account balances at the branch. "
```sql{.line-numbers}
create assertion sum-constraint check
    (not exists
    select * from branch
    where(select sum(amount)
        from loan
        where loan.bname=branch.bnane)>=
            (select sum(amount)
            from account
            where account.bname=branch.bname))
```
## 4.5 SQL Data Types and Schemas
### 4.5.5 `domain`
并非user-defined type, *integrity constraints*最基本的形式
```sql{.line-numbers}
create domain DDollars as numeric(12, 2) not null;
```
可以当作*attribute*使用

我们还可以添加`check`来给性质添加一些约束:
```sql{.line-numbers}
create domain YearlySalary numeric(8,2)
              constraint salary_value_test check(value >= 29000);
```
这里要求`YearlySalary`必须大小大于29000。`constraint salary_value_test`这段话则是可选的，纯粹是给这个constraint起个名字而已

又比如我们可以借此约束取值在某几个数里面:
```sql{.line-numbers}
create domain degree_level varchar(10)
       constraint degree_level_test
                  check (value in ('Bachelors','Masters'));
```

### 4.5.6 Generating Unique Key Values
```sql{.line-numbers}
create sequence seq1
start with 1
increment by 3
minvalue 0
maxvalue 100
cycle;
```
`cycle`大概就是值的大小超出`maxvalue`的时候会cycle回去

取值:
```sql{.line-numbers}
select seq1.nextval from dual;
```
插值:
```sql{.line-numbers}
insert into students values(seq1.nextval, 'John');
```