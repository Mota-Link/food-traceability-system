import React, { useState } from 'react'
import { createType } from '@polkadot/types';
import { TypeRegistry } from '@polkadot/types/create';
import { Form, Input, Grid, Label, Button, Dropdown } from 'semantic-ui-react'
import { useSubstrate, useSubstrateState } from './substrate-lib'
import { TxButton } from './substrate-lib/components'
import "./FoodTraceability.css"
function Main(props) {
  // 从 substrate 连接对象中获取当前状态，并且在状态发生变化时自动更新组件
  // 即：获取 api 这个东西
  // const { api } = useSubstrateState()

  //控制不同按钮的显示
  const [btnType, setBtnType] = useState('produce')
  const {
    state: { keyring },
  } = useSubstrate()

  const keyringOptions = keyring.getPairs().map(account => ({
    key: account.address,
    value: account.address,
    text: account.meta.name.toUpperCase(),
    icon: 'user',
  }))

  return (
    <div className='FoodTraceabilityContainer'>
      <h1 style={{ marginBottom: '25px', marginLeft: '35px' }}>
        食品溯源系统
      </h1>
      <Grid>
        <Grid.Column width={4}>
          <div className='btnContainer'>
            <div className='menuButton'>
              <Button
                style={{ width: '115px' }}
                onClick={_ => setBtnType('produce')}
              >生产</Button>
            </div>
            <div className='menuButton'>
              <Button
                style={{ width: '115px' }}
                onClick={_ => setBtnType('trade')}
              >交易</Button>
            </div>
            <div className='menuButton'>
              <Button
                style={{ width: '115px' }}
                onClick={_ => setBtnType('store')}
              >存储</Button>
            </div>
            <div className='menuButton'>
              <Button
                style={{ width: '115px' }}
                onClick={_ => setBtnType('transport')}
              >运输</Button>
            </div>
            <div className='menuButton'>
              <Button
                style={{ width: '115px' }}
                onClick={_ => setBtnType('setAccountGLN')}
              >设置GLN</Button>
            </div>
            <div className='menuButton'>
              <Button
                style={{ width: '115px' }}
                onClick={_ => setBtnType('setManufacturerLicense')}
              >设置证书</Button>
            </div>
            <div className='menuButton'>
              <Button
                style={{ width: '115px' }}
                onClick={_ => setBtnType('qrCode')}
              >生成溯源码</Button>
            </div>
          </div>
        </Grid.Column>
        <Grid.Column width={12}>
          <TxSelector
            attrs={{
              btnType,
              keyringOptions,
            }}
          />
        </Grid.Column>
      </Grid>
    </div>
  )
}

function TxSelector(props) {
  const [status, setStatus] = useState('')

  const [rawBarCode, setRawBarCode] = useState('')
  const [sscc, setSSCC] = useState('')
  const [gln, setGLN] = useState('')

  const [ownerGLN, setOwnerGLN] = useState('')
  const [nonce, setNonce] = useState(0)
  // setNonce(0)

  const [locate, setLocate] = useState('AccId')
  const [locateAccId, setLocateAccId] = useState('')
  const [locateGLN, setLocateGLN] = useState('')

  const [destination, setDestination] = useState('AccId')
  const [destinationAccId, setDestinationAccId] = useState('')
  const [destinationGLN, setDestinationGLN] = useState('')

  const [carrier, setCarrier] = useState('AccId')
  const [carrierAccId, setCarrierAccId] = useState('')
  const [carrierGLN, setCarrierGLN] = useState('')

  const idOption = [
    { key: 'AccId', value: 'AccId', text: '账户' },
    { key: 'GLN', value: 'GLN', text: 'GLN编码' }
  ]

  const [amount, setAmount] = useState(0)
  const [shelfLifeDays, setShelfLifeDays] = useState(0)

  const unitOptions = [
    { key: 'Portion', value: 'Portion', text: '一份' },
    { key: 'Microgram', value: 'Microgram', text: '微克（μg）' },
    { key: 'Milliliter', value: 'Milliliter', text: '毫升（ml）' }
  ]
  const [unitChoose, setUnitChoose] = useState('Portion')

  const licenseOptions = [
    { key: "registration", value: "registration", text: "设置证书" },
    { key: "cancellation", value: "cancellation", text: "注销证书" }
  ]
  const [licenseChoose, setLicenseChoose] = useState("registration")
  const [licenseInput, setLicenseInput] = useState('')

  const registry = new TypeRegistry();

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
        label="数量"
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
    setMaterialsArr(test)
  }, delMaterials = () => {
    let test = JSON.parse(JSON.stringify(materialsArr))
    test.pop()
    setMaterialsArr(test)
  }

  const setMaterialsArrBytes = (index, value) => {
    let temp = JSON.parse(JSON.stringify(materialsArr))
    temp[index].bytes = value
    setMaterialsArr(temp)
  }
  const setMaterialsArrU128 = (index, value) => {
    let temp = JSON.parse(JSON.stringify(materialsArr))
    temp[index].u128 = value
    setMaterialsArr(temp)
  }

  const {
    attrs: { btnType, keyringOptions },
  } = props

  if (btnType === 'produce') {
    return <Form>
      <Form.Field>
        <div style={{ display: 'flex' }}>
          <Label style={{
            fontSize: 14,
            minWidth: '105px',
            margin: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>生产商</Label>
          <Dropdown
            style={{ width: '105px', minWidth: '105px' }}
            fluid
            selection
            options={idOption}
            value={locate}
            onChange={(_, dropdown) => {
              setLocate(dropdown.value)
            }}
          />
          {locate === 'AccId'
            && <Dropdown
              fluid
              search
              selection
              placeholder="选择生产商"
              options={keyringOptions}
              value={locateAccId}
              onChange={(_, dropdown) => {
                setLocateAccId(dropdown.value)
              }}
            />
          }
          {locate === 'GLN'
            && <Input
              fluid
              minLength='13'
              maxLength='16'
              value={locateGLN}
              onChange={(_, { value }) => setLocateGLN(value)}
            />}
        </div>
      </Form.Field>

      <Form.Field>
        <Input
          label="条形码号"
          minLength='19'
          maxLength='38'
          value={rawBarCode}
          onChange={(_, { value }) => setRawBarCode(value)}
        />
      </Form.Field>
      <Form.Field>
        <Input
          fluid
          label="生产数量"
          min='1'
          type='number'
          value={amount <= 0 ? '' : amount}
          onChange={(_, { value }) => setAmount(value)}
        />
      </Form.Field>

      <Form.Field>
        <div style={{ display: 'flex' }}>
          <Label style={{
            fontSize: 14,
            minWidth: '105px',
            margin: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>计数单位</Label>
          <Dropdown
            placeholder="选择计数单位"
            fluid
            selection
            options={unitOptions}
            state="unitChoose"
            onChange={(_, dropdown) => {
              setUnitChoose(dropdown.value)
            }}
          />
        </div>
      </Form.Field>
      <Form.Field>
        <Input
          fluid
          label="保质期(日)"
          min='1'
          type='number'
          value={shelfLifeDays <= 0 ? '' : shelfLifeDays}
          onChange={(_, { value }) => setShelfLifeDays(value)}
        />
      </Form.Field>
      <Form.Field>
        <ul>
          {ShowMaterialsArr}
        </ul>
        <div style={{ position: 'absolute', bottom: '0', right: '0' }}>
          <Button
            basic
            circular
            compact
            onClick={addMaterials}
          >添加原料</Button>
          <Button
            onClick={delMaterials}
            basic
            circular
            compact
          >删除原料</Button>
        </div>
      </Form.Field>
      <Form.Field>
        <TxButton
          label="确认生产"
          type="SIGNED-TX"
          setStatus={setStatus}
          attrs={{
            palletRpc: 'foodTraceability',
            callable: 'produceFood',
            inputParams: [
              rawBarCode,
              locate === 'AccId' ? { AccId: locateAccId } : { GLN: locateGLN },
              amount,
              unitChoose,
              shelfLifeDays,
              materialsArr
            ],
            paramFields: [true, true, true, true, true, true],
          }}
        />
      </Form.Field>
      <div style={{ overflowWrap: 'break-word' }}>{status}</div>
    </Form >
  }
  else if (btnType === 'trade') {
    return <Form>
      <Form.Field>
        <div style={{ display: 'flex' }}>
          <Label style={{
            fontSize: 14,
            minWidth: '105px',
            margin: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>商品位置</Label>
          <Dropdown
            style={{ width: '105px', minWidth: '105px' }}
            fluid
            selection
            options={idOption}
            value={locate}
            onChange={(_, dropdown) => {
              setLocate(dropdown.value)
            }}
          />
          {locate === 'AccId'
            && <Dropdown
              search
              fluid
              selection
              placeholder="选择商品位置"
              options={keyringOptions}
              value={locateAccId}
              onChange={(_, dropdown) => {
                setLocateAccId(dropdown.value)
              }}
            />}
          {locate === 'GLN'
            && <Input
              fluid
              minLength='13'
              maxLength='16'
              value={locateGLN}
              onChange={(_, { value }) => setLocateGLN(value)}
            />}

        </div>
      </Form.Field>

      <Form.Field>
        <div style={{ display: 'flex' }}>
          <Label style={{
            fontSize: 14,
            minWidth: '105px',
            margin: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>购买方</Label>
          <Dropdown
            style={{ width: '105px', minWidth: '105px' }}
            selection
            options={idOption}
            value={destination}
            onChange={(_, dropdown) => {
              setDestination(dropdown.value)
            }}
          />
          {destination === 'AccId'
            && <Dropdown
              search
              fluid
              selection
              placeholder="选择买家位置"
              options={keyringOptions}
              value={destinationAccId}
              onChange={(_, dropdown) => {
                setDestinationAccId(dropdown.value)
              }}
            />}
          {destination === 'GLN'
            && <Input
              fluid
              minLength='13'
              maxLength='16'
              value={destinationGLN}
              onChange={(_, { value }) => setDestinationGLN(value)}
            />}
        </div>
      </Form.Field>

      <Form.Field>
        <Input
          style={{ marginTop: '10px' }}
          fluid
          label="条形码号"
          minLength='19'
          maxLength='38'
          value={rawBarCode}
          onChange={(_, { value }) => setRawBarCode(value)}
        />
      </Form.Field>

      <Form.Field>
        <Input
          fluid
          label="交易数量"
          min='1'
          type='number'
          value={amount <= 0 ? '' : amount}
          onChange={(_, { value }) => setAmount(value)}
        />
      </Form.Field>
      <Form.Field>
        <TxButton
          label="确认交易"
          type="SIGNED-TX"
          setStatus={setStatus}
          attrs={{
            palletRpc: 'foodTraceability',
            callable: 'tradeFood',
            inputParams: [
              rawBarCode,
              locate === 'AccId' ? { AccId: locateAccId } : { GLN: locateGLN },
              destination === 'AccId' ? { AccId: destinationAccId } : { GLN: destinationGLN },
              amount
            ],
            paramFields: [true, true, true, true],
          }}
        />
      </Form.Field>
      <div style={{ overflowWrap: 'break-word' }}>{status}</div>
    </Form>
  }
  else if (btnType === 'store') {
    return <Form>
      <Form.Field>
        <div style={{ display: 'flex' }}>
          <Label style={{
            fontSize: 14,
            minWidth: '105px',
            margin: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>仓库位置</Label>
          <Dropdown
            style={{ width: '105px', minWidth: '105px' }}
            selection
            options={idOption}
            value={locate}
            onChange={(_, dropdown) => {
              setLocate(dropdown.value)
            }}
          />
          {locate === 'AccId'
            && <Dropdown
              search
              fluid
              selection
              placeholder="选择仓库位置"
              options={keyringOptions}
              value={locateAccId}
              onChange={(_, dropdown) => {
                setLocateAccId(dropdown.value)
              }}
            />}
          {locate === 'GLN'
            && <Input
              fluid
              minLength='13'
              maxLength='16'
              value={locateGLN}
              onChange={(_, { value }) => setLocateGLN(value)}
            />}
        </div>
      </Form.Field>
      <Form.Field>
        <Input
          className='customLabelInput'
          style={{ marginTop: '10px' }}
          fluid
          label="条形码号"
          minLength='19'
          maxLength='38'
          value={rawBarCode}
          onChange={(_, { value }) => setRawBarCode(value)}
        />
      </Form.Field>

      <Form.Field>
        <Input
          fluid
          label="SSCC编码"
          minLength='18'
          maxLength='20'
          value={sscc}
          onChange={(_, { value }) => setSSCC(value)}
        />
      </Form.Field>
      <Form.Field>
        <Input
          fluid
          label="存储数量"
          min='1'
          type='number'
          value={amount <= 0 ? '' : amount}
          onChange={(_, { value }) => setAmount(value)}
        />
      </Form.Field>
      <Form.Field>
        <TxButton
          label="确认存储"
          type="SIGNED-TX"
          setStatus={setStatus}
          attrs={{
            palletRpc: 'foodTraceability',
            callable: 'storeFood',
            inputParams: [
              rawBarCode,
              locate === 'AccId' ? { AccId: locateAccId } : { GLN: locateGLN },
              sscc,
              amount
            ],
            paramFields: [true, true, true, true],
          }}
        />
      </Form.Field>
      <div style={{ overflowWrap: 'break-word' }}>{status}</div>
    </Form>
  }
  else if (btnType === 'transport') {
    return <Form>
      <Form.Field>
        <div style={{ display: 'flex' }}>
          <Label style={{
            fontSize: 14,
            minWidth: '105px',
            margin: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>当前位置</Label>
          <Dropdown
            style={{ width: '105px', minWidth: '105px' }}
            selection
            options={idOption}
            value={locate}
            onChange={(_, dropdown) => {
              setLocate(dropdown.value)
            }}
          />
          {locate === 'AccId'
            && <Dropdown
              search
              fluid
              selection
              placeholder="选择商品位置"
              options={keyringOptions}
              value={locateAccId}
              onChange={(_, dropdown) => {
                setLocateAccId(dropdown.value)
              }}
            />}
          {locate === 'GLN'
            && <Input
              fluid
              minLength='13'
              maxLength='16'
              value={locateGLN}
              onChange={(_, { value }) => setLocateGLN(value)}
            />}
        </div>
      </Form.Field>
      <Form.Field>
        <div style={{ display: 'flex' }}>
          <Label style={{
            fontSize: 14,
            minWidth: '105px',
            margin: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>目的位置</Label>
          <Dropdown
            style={{ width: '105px', minWidth: '105px' }}
            selection
            options={idOption}
            value={destination}
            onChange={(_, dropdown) => {
              setDestination(dropdown.value)
            }}
          />
          {destination === 'AccId'
            && <Dropdown
              search
              fluid
              selection
              placeholder="选择运输目的地"
              options={keyringOptions}
              value={destinationAccId}
              onChange={(_, dropdown) => {
                setDestinationAccId(dropdown.value)
              }}
            />}
          {destination === 'GLN'
            && <Input
              fluid
              minLength='13'
              maxLength='16'
              value={destinationGLN}
              onChange={(_, { value }) => setDestinationGLN(value)}
            />}
        </div>
      </Form.Field>

      <Form.Field>
        <div style={{ display: 'flex' }}>
          <Label style={{
            fontSize: 14,
            minWidth: '105px',
            margin: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>承运商</Label>
          <Dropdown
            style={{ width: '105px', minWidth: '105px' }}
            selection
            options={idOption}
            value={carrier}
            onChange={(_, dropdown) => {
              setCarrier(dropdown.value)
            }}
          />
          {carrier === 'AccId'
            && <Dropdown
              search
              fluid
              selection
              placeholder="选择承运商"
              options={keyringOptions}
              value={carrierAccId}
              onChange={(_, dropdown) => {
                setCarrierAccId(dropdown.value)
              }}
            />}
          {carrier === 'GLN'
            && <Input
              fluid
              minLength='13'
              maxLength='16'
              value={carrierGLN}
              onChange={(_, { value }) => setCarrierGLN(value)}
            />}
        </div>
      </Form.Field>
      <Form.Field>
        <Input
          style={{ marginTop: '10px' }}
          fluid
          label="条形码号"
          minLength='19'
          maxLength='38'
          value={rawBarCode}
          onChange={(_, { value }) => setRawBarCode(value)}
        />
      </Form.Field>
      <Form.Field>
        <Input
          fluid
          label="SSCC编码"
          minLength='18'
          maxLength='20'
          value={sscc}
          onChange={(_, { value }) => setSSCC(value)}
        />
      </Form.Field>
      <Form.Field>
        <Input
          fluid
          label="运输数量"
          min='1'
          type='number'
          value={amount <= 0 ? '' : amount}
          onChange={(_, { value }) => setAmount(value)}
        />
      </Form.Field>
      <Form.Field>
        <TxButton
          label="确认运输"
          type="SIGNED-TX"
          setStatus={setStatus}
          attrs={{
            palletRpc: 'foodTraceability',
            callable: 'transportFood',
            inputParams: [
              rawBarCode,
              locate === 'AccId' ? { AccId: locateAccId } : { GLN: locateGLN },
              destination === 'AccId' ? { AccId: destinationAccId } : { GLN: destinationGLN },
              carrier === 'AccId' ? { AccId: carrierAccId } : { GLN: carrierGLN },
              sscc,
              amount
            ],
            paramFields: [true, true, true, true, true, true],
          }}
        />
      </Form.Field>
      <div style={{ overflowWrap: 'break-word' }}>{status}</div>
    </Form>
  }
  else if (btnType === 'setAccountGLN') {
    return <Form>
      <Form.Field>
        <div style={{ display: 'flex' }}>
          <Label style={{
            fontSize: 14,
            minWidth: '105px',
            margin: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>目标账户</Label>
          <Dropdown
            search
            fluid
            selection
            placeholder="选择账户"
            options={keyringOptions}
            value={locateAccId}
            onChange={(_, dropdown) => {
              setLocateAccId(dropdown.value)
            }}
          />
        </div>
      </Form.Field>
      <Form.Field>
        <Input
          style={{ marginTop: '10px' }}
          fluid
          label="GLN编码"
          minLength='13'
          maxLength='16'
          value={gln}
          onChange={(_, { value }) => setGLN(value)}
        />
      </Form.Field>
      <Form.Field>
        <TxButton
          label="确认设置（管理员）"
          type="SUDO-TX"
          setStatus={setStatus}
          attrs={{
            palletRpc: 'foodTraceability',
            callable: 'setAccountGln',
            inputParams: [
              locateAccId,
              gln
            ],
            paramFields: [true, true],
          }}
        />
      </Form.Field>
      <div style={{ overflowWrap: 'break-word' }}>{status}</div>
    </Form>
  }
  else if (btnType === 'setManufacturerLicense') {
    return <Form>
      <Form.Field>
        <div style={{ display: 'flex' }}>
          <Label style={{
            fontSize: 14,
            minWidth: '105px',
            margin: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>目标厂商</Label>
          <Dropdown
            style={{ width: '105px', minWidth: '105px' }}
            selection
            options={idOption}
            value={locate}
            onChange={(_, dropdown) => {
              setLocate(dropdown.value)
            }}
          />
          {locate === 'AccId'
            && <Dropdown
              search
              fluid
              selection
              placeholder="选择制造商"
              options={keyringOptions}
              value={locateAccId}
              onChange={(_, dropdown) => {
                setLocateAccId(dropdown.value)
              }}
            />}
          {locate === 'GLN'
            && <Input
              fluid
              minLength='13'
              maxLength='16'
              value={locateGLN}
              onChange={(_, { value }) => setLocateGLN(value)}
            />}
        </div>
      </Form.Field>
      <Form.Field>
        <div style={{ display: 'flex' }}>
          <Label style={{
            fontSize: 14,
            minWidth: '105px',
            margin: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>操作</Label>
          <Dropdown
            placeholder="license"
            style={{ width: '105px', minWidth: '105px' }}
            selection
            options={licenseOptions}
            state="licenseChoose"
            value={licenseChoose}
            onChange={(_, dropdown) => {
              setLicenseChoose(dropdown.value)
            }}
          />
          {licenseChoose === 'registration'
            ? <Input
              fluid
              minLength='16'
              maxLength='18'
              type="text"
              value={licenseInput}
              onChange={(_, { value }) => setLicenseInput(value)}
            />
            : null}
        </div>
      </Form.Field>
      <Form.Field>
        <TxButton
          label="确认设置（管理员）"
          type="SUDO-TX"
          setStatus={setStatus}
          attrs={{
            palletRpc: 'foodTraceability',
            callable: 'setManufacturerLicense',
            inputParams: [
              locate === 'AccId' ? { AccId: locateAccId } : { GLN: locateGLN },
              licenseChoose == 'registration'
                ? createType(registry, 'Option<Vec<u8>>', licenseInput)
                : createType(registry, 'Option<Vec<u8>>'),
            ],
            paramFields: [true, true],
          }}
        />
      </Form.Field>
      <div style={{ overflowWrap: 'break-word' }}>{status}</div>
    </Form>
  }
  else if (btnType === 'qrCode') {
    return <Form>
      <Form.Field>
        <Input
          label="条形码号"
          minLength='19'
          maxLength='38'
          value={rawBarCode}
          onChange={(_, { value }) => setRawBarCode(value)}
        />
      </Form.Field>
      <Form.Field>
        <Input
          style={{ marginTop: '10px' }}
          fluid
          label="所有者GLN"
          minLength='13'
          maxLength='16'
          value={ownerGLN}
          onChange={(_, { value }) => setOwnerGLN(value)}
        />
      </Form.Field>
      <Form.Field>
        <Input
          style={{ marginTop: '10px' }}
          fluid
          label="位置GLN"
          minLength='13'
          maxLength='16'
          value={locateGLN}
          onChange={(_, { value }) => setLocateGLN(value)}
        />
      </Form.Field>
      <Form.Field>
        <Input
          fluid
          label="分批号"
          min='0'
          type='number'
          state='nonce'
          onChange={(_, { value }) => setNonce(value)}
        />
      </Form.Field>
      <Form.Field>
        <TxButton
          label="确认生成"
          type="RPC"
          setStatus={setStatus}
          attrs={{
            palletRpc: 'foodTraceability',
            callable: 'getTrace',
            inputParams: [
              createType(registry, 'Option<BlockHash>'),
              rawBarCode,
              ownerGLN,
              locateGLN,
              nonce
            ],
            paramFields: [true, true, true, true, true],
          }}
        />
      </Form.Field>
      {status === '<Error>' || status === ''
        ? <div style={{ overflowWrap: 'break-word' }}>{status}</div>
        : <img src={status} />
      }

    </Form>
  }
}




export default function FoodTraceability(props) {
  const { api } = useSubstrateState()
  // 三元表达式 
  // 如果包含 templateModule 模块和 something 函数，就返回 <Main>
  // 否则返回 null，不渲染界面
  return api.query.foodTraceability ? (
    <Main {...props} />
  ) : null
}
