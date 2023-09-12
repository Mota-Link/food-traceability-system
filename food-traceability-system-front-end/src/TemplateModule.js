import React, { useEffect, useState } from 'react'
import { Form, Input, Grid, Card, Statistic, Button, Dropdown } from 'semantic-ui-react'

import { useSubstrate, useSubstrateState } from './substrate-lib'
// import { TxButton } from './substrate-lib/components'

function Main(props) {
  // 从 substrate 连接对象中获取当前状态，并且在状态发生变化时自动更新组件
  // 即：获取 api 这个东西
  const { api } = useSubstrateState()

  //控制不同按钮的显示
  const [btnType, setBtnType] = useState(0)
  const [currentValue, setCurrentValue] = useState(0)
  const [formValue, setFormValue] = useState('')
  console.log(formValue)
  const {
    state: { keyring },
  } = useSubstrate()

  // Get the list of accounts we possess the private key for
  const keyringOptions = keyring.getPairs().map(account => ({
    key: account.address,
    value: account.address,
    text: account.meta.name.toUpperCase(),
    icon: 'user',
  }))

  // useEffect：在状态变化时执行闭包
  useEffect(
    // 参数 1：回调函数（闭包）
    () => {
      // 用于取消对状态的监听
      let unsubscribe
      // 监听该存储的状态，变化时触发回调函数
      api.query.templateModule.something(
        // 如果该方法需要接收参数，则在前面添加该参数
        // 如 arg1，arg2，返回闭包
        newValue => {
          // 返回值是 Option，因此需要先判空
          if (newValue.isNone) {
            setCurrentValue('<None>')
          } else {
            setCurrentValue(newValue.unwrap().toNumber())
          }
        })
        // 方法返回取消监听的函数，绑定到 unsubscribe，用于取消监听
        .then(unsub => {
          unsubscribe = unsub
        })
        // 处理错误，输出到控制台
        .catch(console.error)

      return () => unsubscribe && unsubscribe()
    },
    // 参数 2：要监听的状态值
    // 这些值变化时，才调用 useEffect 参数闭包
    [api.query.templateModule])

  return (
    <Grid.Column width={8}>
      <h1>Template Module</h1>
      <Card centered>
        <Card.Content textAlign="center">
          <Statistic label="Current Value" value={currentValue} />
        </Card.Content>
      </Card>
      <Form>
        <Form.Field>
          {/* 输入框 */}
          <Input
            // 输入框左侧提示文本
            label="New Value"
            // 输入值绑定到 newValue 变量
            // 输入的值是数字
            state="formValue"
            type="number"
            // 输入框值变化时，调用 onChange 
            // 这里将值设置到 formValue 变量
            onChange={(_, { value }) => setFormValue(value)}
          />
        </Form.Field>
        <Form.Field style={{ textAlign: 'center', dispaly: 'flex' }}>

          {/* 发送交易按钮  */}
          {/* polkadot.js 特色按钮，点一点发送交易 */}
          <Button
            onClick={_ => setBtnType(0)}
          >produce_food</Button>
          <Button
            onClick={_ => setBtnType(1)}
          >trade_food</Button>
          <Button
            onClick={_ => setBtnType(2)}
          >store_food</Button>
        </Form.Field>
        <Form.Field style={{ textAlign: 'center', dispaly: 'flex' }}>
          <Button
            onClick={_ => setBtnType(3)}
          >transport_food</Button>
          <Button
            onClick={_ => setBtnType(4)}
          >set_account_gln</Button>
          <Button
            onClick={_ => setBtnType(5)}
          >set_manufacturer_license</Button>
        </Form.Field>
      </Form>
      {/* 按钮对应的form */}
      <InteractorSubmit
        attrs={{
          btnType,
          keyring,
          keyringOptions
        }}
      />
      {/* 显示提交状态 */}
      <div style={{ overflowWrap: 'break-word' }}>{btnType}</div>
    </Grid.Column>
  )
}

function InteractorSubmit(props) {
  // const acctAddr = acct => {
  //   let index = keyringOptions.findIndex(e => e.value === acct)
  //   console.log('hhh', keyringOptions, index, acct, keyringOptions[index].text)
  //   if (index !== -1)
  //     return keyringOptions[index].text
  //   else
  //     return ''
  // }
  const [raw_bar_code, setRawBarCode] = useState(0)
  const [sscc, setSscc] = useState(0)

  //Id<T::AccountId>变量1
  const [manufacturerChoose1, setManufacturerChoose1] = useState('GLN')
  const [AccIdChoose1, setAccIdChoose1] = useState('')
  const [manufacturerInput1, setManufacturerInput1] = useState('')

  //2
  const [manufacturerChoose2, setManufacturerChoose2] = useState('GLN')
  const [AccIdChoose2, setAccIdChoose2] = useState('')
  const [manufacturerInput2, setManufacturerInput2] = useState('')

  //3
  const [manufacturerChoose3, setManufacturerChoose3] = useState('GLN')
  const [AccIdChoose3, setAccIdChoose3] = useState('')
  const [manufacturerInput3, setManufacturerInput3] = useState('')

  //避免变量未引用报错
  console.log(sscc, raw_bar_code)
  const manufacturerOption = [
    { key: 'AccId', value: 'AccId', text: 'AccId' }, { key: 'GLN', value: 'GLN', text: 'GLN' }]

  function ManufacturerItem({ choose, thisInput, thisChoose, setChoose, setInput }) {
    if (choose === "AccId") {
      return (
        <ul style={{ listStyle: 'none' }}>
          <li>
            <Dropdown
              search
              fluid
              selection
              options={keyringOptions}
              // value={acctAddr(thisChoose)}
              state={thisChoose}
              onChange={(_, dropdown) => {
                setChoose(dropdown.value)
              }}
            />
          </li>
        </ul>)
    }
    else
      return (
        <ul style={{ listStyle: 'none' }}>
          <li>
            <Input
              fluid
              label={choose}
              value={thisInput}
              onChange={(_, { value }) => setInput(value)}
            />
          </li>
        </ul >
      )
  }

  function LicenseItem({ choose, thisInput, setInput }) {
    if (choose === "填写证书") {
      return (
        <ul style={{ listStyle: 'none' }}>
          <li>
            <Input
              style={{ marginBottom: '10px' }}
              fluid
              label="填写证书"
              type="number"
              state={thisInput}
              onChange={(_, { value }) => setInput(value)}
            />
          </li>
        </ul>)
    }
    else {
      return (
        <ul></ul>
      )
    }
  }


  const changeManufacturerChoose1 = addr => {
    setManufacturerChoose1(addr)
  },
    changeManufacturerChoose2 = addr => {
      setManufacturerChoose2(addr)
    }, changeManufacturerChoose3 = addr => {
      setManufacturerChoose3(addr)
    },
    onUnitChange = addr => {
      setUnitChoose(addr)
    },
    onLicenseChange = addr => {
      setLicenseChoose(addr)
    }
  const [amount, setAmount] = useState(1)
  const [shelfLifeDays, setShelfLifeDays] = useState(1)

  const unitOptions = [
    { key: 'Portion', value: 'Portion', text: 'Portion' }, { key: 'Microgram', value: 'Microgram', text: 'Microgram' }, { key: 'Milliliter', value: 'Milliliter', text: 'Milliliter' }]
  const [unitChoose, setUnitChoose] = useState('Portion')

  const licenseOptions = [{ key: 1, value: "填写证书", text: "填写证书" }, { key: 2, value: "无证书", text: "无证书" }]
  const [licenseChoose, setLicenseChoose] = useState("填写证书")
  const [licenseInput, setLicenseInput] = useState("")

  console.log(unitChoose, licenseChoose, amount)

  const [materialsArr, setMaterialsArr] = useState([])
  const ShowMaterialsArr = materialsArr.map((e, index) =>
    <li key={e.key} style={{ listStyle: 'none' }}>
      <Input
        style={{ marginBottom: '10px' }}
        fluid
        label={"原料" + Number(index + 1)}
        type="number"
        onChange={(_, { value }) => setMaterialsArrBytes(index, value)}
      />
      <Input
        style={{ marginBottom: '10px' }}
        fluid
        label="U128"
        type="number"
        onChange={(_, { value }) => setMaterialsArrU128(index, value)}
      />
    </li>
  );

  const addMaterials = () => {
    let test = JSON.parse(JSON.stringify(materialsArr))
    test.push({
      key: materialsArr.length,
      bytes: 1, u128: 1
    })
    console.log('添加项目', test)
    setMaterialsArr(test)
  }, delMaterials = () => {
    let test = JSON.parse(JSON.stringify(materialsArr))
    test.pop()
    setMaterialsArr(test)
    console.log('移出项目', test)
  }

  const setMaterialsArrBytes = (index, value) => {
    let temp = JSON.parse(JSON.stringify(materialsArr))
    temp[index].bytes = value
    console.log('重新设置值', temp)
    setMaterialsArr(temp)
  }
  const setMaterialsArrU128 = (index, value) => {
    let temp = JSON.parse(JSON.stringify(materialsArr))
    temp[index].u128 = value
    console.log('重新设置值', temp)
    setMaterialsArr(temp)
  }



  const {
    attrs: { btnType, keyringOptions },
  } = props
  if (btnType === 0) {
    return <Form>
      <div style={{ overflowWrap: 'break-word' }}>{shelfLifeDays}</div>
      <Form.Field>
        <Input
          style={{ marginTop: '10px' }}
          fluid
          label="raw_bar_code"
          state="raw_bar_code"
          type='number'
          onChange={(_, { value }) => setRawBarCode(value)}
        />
      </Form.Field>
      <Form.Field>
        {AccIdChoose1}
        {manufacturerInput1}
        <Dropdown
          fluid
          selection
          options={manufacturerOption}
          state="manufacturerChoose1"
          onChange={(_, dropdown) => {
            changeManufacturerChoose1(dropdown.value)
          }}
        />
        <ManufacturerItem
          choose={manufacturerChoose1}
          thisInput={manufacturerInput1}
          setInput={setManufacturerInput1}
          setChoose={setAccIdChoose1}
          thisChoose={AccIdChoose1}
        />
      </Form.Field>

      <Form.Field>
        <Input
          fluid
          label="amount"
          type='number'
          state="amount"
          onChange={(_, { value }) => setAmount(value)}
        />
      </Form.Field>

      <Form.Field>
        <Dropdown
          placeholder="unit"
          fluid
          selection
          options={unitOptions}
          state="unitChoose"
          onChange={(_, dropdown) => {
            onUnitChange(dropdown.value)
          }}
        />
      </Form.Field>
      <Form.Field>
        <div style={{ position: 'relative', paddingBottom: '40px' }}>
          <Input
            fluid
            label="shelfLifeDays"
            type='number'
            state="shelfLifeDays"
            onChange={(_, { value }) => setShelfLifeDays(value)}
          />
          <ul>
            {ShowMaterialsArr}
          </ul>
          <div style={{ position: 'absolute', bottom: '0', right: '0' }}>
            <Button
              icon="copy outline"
              basic
              circular
              compact
              onClick={addMaterials}
            >添加项目</Button>
            <Button
              onClick={delMaterials}
              icon="copy outline"
              basic
              circular
              compact
            >移出项目</Button>
          </div>
        </div>
      </Form.Field>

    </Form>
  }
  else if (btnType === 1) {
    return <Form>
      <Form.Field>
        <Input
          style={{ marginTop: '10px' }}
          fluid
          label="raw_bar_code"
          state="raw_bar_code"
          type='number'
          onChange={(_, { value }) => setRawBarCode(value)}
        />
      </Form.Field>
      <Form.Field>
        {manufacturerInput2}
        {AccIdChoose2}
        <Dropdown
          fluid
          selection
          options={manufacturerOption}
          state="manufacturerChoose2"
          onChange={(_, dropdown) => {
            changeManufacturerChoose2(dropdown.value)
          }}
        />
        <ManufacturerItem
          choose={manufacturerChoose2}
          thisInput={manufacturerInput2}
          setInput={setManufacturerInput2}
          setChoose={setAccIdChoose2}
          thisChoose={AccIdChoose2}
        />
      </Form.Field>
      <Form.Field>
        {manufacturerInput3}
        {AccIdChoose3}
        <Dropdown
          fluid
          selection
          options={manufacturerOption}
          state="manufacturerChoose3"
          onChange={(_, dropdown) => {
            changeManufacturerChoose3(dropdown.value)
          }}
        />
        <ManufacturerItem
          choose={manufacturerChoose3}
          thisInput={manufacturerInput3}
          setInput={setManufacturerInput3}
          setChoose={setAccIdChoose3}
          thisChoose={AccIdChoose3}
        />
      </Form.Field>
      <Form.Field>
        <Input
          fluid
          label="amount"
          type='number'
          state="amount"
          onChange={(_, { value }) => setAmount(value)}
        />
      </Form.Field>
    </Form>
  }
  else if (btnType === 2) {
    return <Form>
      <Form.Field>
        <Input
          style={{ marginTop: '10px' }}
          fluid
          label="raw_bar_code"
          state="raw_bar_code"
          type='number'
          onChange={(_, { value }) => setRawBarCode(value)}
        />
      </Form.Field>
      <Form.Field>
        {AccIdChoose1}
        {manufacturerInput1}
        <Dropdown
          fluid
          selection
          options={manufacturerOption}
          state="manufacturerChoose1"
          onChange={(_, dropdown) => {
            changeManufacturerChoose1(dropdown.value)
          }}
        />
        <ManufacturerItem
          choose={manufacturerChoose1}
          thisInput={manufacturerInput1}
          setInput={setManufacturerInput1}
          setChoose={setAccIdChoose1}
          thisChoose={AccIdChoose1}
        />
      </Form.Field>
      <Form.Field>
        <Input
          fluid
          label="sscc"
          state="sscc"
          type='number'
          onChange={(_, { value }) => setSscc(value)}
        />
      </Form.Field>
      <Form.Field>
        <Input
          fluid
          label="amount"
          type='number'
          state="amount"
          onChange={(_, { value }) => setAmount(value)}
        />
      </Form.Field>
    </Form>
  }
  else if (btnType === 3) {
    return <Form>
      <Form.Field>
        <Input
          style={{ marginTop: '10px' }}
          fluid
          label="raw_bar_code"
          state="raw_bar_code"
          type='number'
          onChange={(_, { value }) => setRawBarCode(value)}
        />
      </Form.Field>
      <Form.Field>
        {AccIdChoose1}
        {manufacturerInput1}
        <Dropdown
          fluid
          selection
          options={manufacturerOption}
          state="manufacturerChoose1"
          onChange={(_, dropdown) => {
            changeManufacturerChoose1(dropdown.value)
          }}
        />
        <ManufacturerItem
          choose={manufacturerChoose1}
          thisInput={manufacturerInput1}
          setInput={setManufacturerInput1}
          setChoose={setAccIdChoose1}
          thisChoose={AccIdChoose1}
        />
      </Form.Field>
      <Form.Field>
        {manufacturerInput2}
        {AccIdChoose2}
        <Dropdown
          fluid
          selection
          options={manufacturerOption}
          state="manufacturerChoose2"
          onChange={(_, dropdown) => {
            changeManufacturerChoose2(dropdown.value)
          }}
        />
        <ManufacturerItem
          choose={manufacturerChoose2}
          thisInput={manufacturerInput2}
          setInput={setManufacturerInput2}
          setChoose={setAccIdChoose2}
          thisChoose={AccIdChoose2}
        />
      </Form.Field>
      <Form.Field>
        {manufacturerInput3}
        {AccIdChoose3}
        <Dropdown
          fluid
          selection
          options={manufacturerOption}
          state="manufacturerChoose3"
          onChange={(_, dropdown) => {
            changeManufacturerChoose3(dropdown.value)
          }}
        />
        <ManufacturerItem
          choose={manufacturerChoose3}
          thisInput={manufacturerInput3}
          setInput={setManufacturerInput3}
          setChoose={setAccIdChoose3}
          thisChoose={AccIdChoose3}
        />
      </Form.Field>



      <Form.Field>
        <Input
          fluid
          label="sscc"
          state="sscc"
          type='number'
          onChange={(_, { value }) => setSscc(value)}
        />
      </Form.Field>
      <Form.Field>
        <Input
          fluid
          label="amount"
          type='number'
          state="amount"
          onChange={(_, { value }) => setAmount(value)}
        />
      </Form.Field>
    </Form>
  }
  else if (btnType === 4) {
    return <Form>
      <Form.Field>
        <Dropdown
          style={{ marginTop: '10px' }}
          fluid
          selection
          options={manufacturerOption}
          state="manufacturerChoose1"
          onChange={(_, dropdown) => {
            changeManufacturerChoose1(dropdown.value)
          }}
        />
        <ManufacturerItem
          choose={manufacturerChoose1}
          thisInput={manufacturerInput1}
          setInput={setManufacturerInput1}
          setChoose={setAccIdChoose1}
          thisChoose={AccIdChoose1}
        />
      </Form.Field>
      <Form.Field>
        <Input
          style={{ marginTop: '10px' }}
          fluid
          label="raw_bar_code"
          state="raw_bar_code"
          type='number'
          onChange={(_, { value }) => setRawBarCode(value)}
        />
      </Form.Field>
    </Form>
  }
  else if (btnType === 5) {
    return <Form>
      <Form.Field>
        <Dropdown
          style={{ marginTop: '10px' }}
          fluid
          selection
          options={manufacturerOption}
          state="manufacturerChoose1"
          onChange={(_, dropdown) => {
            changeManufacturerChoose1(dropdown.value)
          }}
        />
        <ManufacturerItem
          choose={manufacturerChoose1}
          thisInput={manufacturerInput1}
          setInput={setManufacturerInput1}
          setChoose={setAccIdChoose1}
          thisChoose={AccIdChoose1}
        />
      </Form.Field>
      <Form.Field>
        <Dropdown
          placeholder="license"
          fluid
          selection
          options={licenseOptions}
          state="licenseChoose"
          onChange={(_, dropdown) => {
            onLicenseChange(dropdown.value)
          }}
        />
        <LicenseItem
          choose={licenseChoose}
          thisInput={licenseInput}
          setInput={setLicenseInput}
        />
      </Form.Field>
    </Form>
  }
}



export default function TemplateModule(props) {
  const { api } = useSubstrateState()
  // 三元表达式 
  // 如果包含 templateModule 模块和 something 函数，就返回 <Main>
  // 否则返回 null，不渲染界面
  return api.query.templateModule && api.query.templateModule.something ? (
    <Main {...props} />
  ) : null
}
